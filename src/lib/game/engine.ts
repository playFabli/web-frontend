import {
	Engine,
	Scene,
	ArcRotateCamera,
	HemisphericLight,
	DirectionalLight,
	Vector3,
	Color3,
	Color4,
	MeshBuilder,
	StandardMaterial,
	TransformNode,
	SceneLoader
} from '@babylonjs/core';
import "@babylonjs/loaders";
// Swap to '@babylonjs/loaders/glTF' (and a .glb file) once you're loading
// real Blender-exported models instead of the placeholder OBJ - glTF/GLB
// is the format Babylon.js is built around, and it's what to export to
// from Blender (File > Export > glTF 2.0). Babylon cannot load .blend or
// .fbx files directly in the browser.

import { InputManager } from './input';
import { PlayerController } from './playerController';
import { RemotePlayer } from './remotePlayer';
import { GameNetwork, type PlayerState } from './network';
import { ImportMeshAsync } from '@babylonjs/core';

const AVATAR_URL = '/game-assets/avatar.obj';

export interface GameOptions {
	serverUrl: string; // e.g. "ws://localhost:8080"
	playerName: string;
}

export interface GameHandle {
	dispose: () => void;
}

async function loadAvatarInto(scene: Scene, parentName: string): Promise<TransformNode> {
	const result = await ImportMeshAsync(
		AVATAR_URL, // 1. Источник (строка или файл)
		scene       // 2. Сцена
	);
	const root = new TransformNode(parentName, scene);
	for (const mesh of result.meshes) {
		if (mesh.name === '__root__') continue;
		mesh.parent = root;
		mesh.isPickable = false;
		mesh.receiveShadows = true;
	}
	return root;
}

export async function createGame(canvas: HTMLCanvasElement, gameId: string, opts: GameOptions): Promise<GameHandle> {
	const engine = new Engine(canvas, true, { stencil: true, preserveDrawingBuffer: true }, true);
	const scene = new Scene(engine);
	scene.clearColor = new Color4(0.53, 0.75, 0.92, 1);
	scene.collisionsEnabled = true;

	// --- Input (created early so the camera can use it for orbit) ---
	const input = new InputManager();

	// --- Camera: third-person follow, ROBLOX-style ---
	// Right-click drag orbits the camera (ROBLOX's default camera control).
	// We deliberately skip camera.attachControl so left-click is left free
	// for future interactions (clicking buttons, picking up items, etc.).
	// The orbit handler below uses pointer events, which fire regardless of
	// any preventDefault() calls.
	// ROBLOX-style default framing: camera sits well behind and above the
	// character (large radius, moderate pitch) so the character can never
	// easily walk to the camera's position.
	const camera = new ArcRotateCamera('camera', -Math.PI / 2, 1.25, 12, new Vector3(0, 1.5, 0), scene);
	camera.lowerRadiusLimit = 3;
	camera.upperRadiusLimit = 15;
	camera.lowerBetaLimit = 0.25;
	camera.upperBetaLimit = Math.PI / 2.1;
	camera.wheelPrecision = 40;
	// NOTE: no checkCollisions on the camera. Camera collision raycasts would
	// hit the player's own collider capsule, clamping the camera to a fixed
	// minimum distance and preventing it from following the player. The
	// player's collider handles wall/ground collision; the camera just orbits.

	// Right-drag orbit (ROBLOX-style): while the right mouse button is held,
	// mouse movement rotates the camera around the player.
	const ORBIT_SENSITIVITY = 0.005;
	input.onMouseMove = (movementX, movementY) => {
		if (!input.isRightMouseDown()) return;
		camera.alpha = (camera.alpha ?? 0) - movementX * ORBIT_SENSITIVITY;
		camera.beta = Math.min(
			camera.upperBetaLimit ?? Math.PI / 2,
			Math.max(camera.lowerBetaLimit ?? 0, (camera.beta ?? 1.15) - movementY * ORBIT_SENSITIVITY)
		);
	};

	// --- Lighting ---
	const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
	hemi.intensity = 0.75;
	const sun = new DirectionalLight('sun', new Vector3(-0.6, -1, -0.4), scene);
	sun.intensity = 0.55;

	// --- Ground ---
	const ground = MeshBuilder.CreateGround('ground', { width: 80, height: 80 }, scene);
	ground.checkCollisions = true;
	const groundMat = new StandardMaterial('groundMat', scene);
	groundMat.diffuseColor = new Color3(0.36, 0.58, 0.36);
	groundMat.specularColor = new Color3(0, 0, 0);
	ground.material = groundMat;

	// --- Local player ---
	const localModelRoot = await loadAvatarInto(scene, 'localModelRoot');
	const player = new PlayerController(scene, camera, input, localModelRoot);

	// --- Networking + remote players ---
	const network = new GameNetwork();
	const remotePlayers = new Map<string, RemotePlayer>();
	const spawningRemote = new Set<string>();

	// Guard against double-spawn: spawnRemote is async (awaits the OBJ
	// fetch), so onState can fire again with the same player before the
	// first spawn finishes. Track in-flight spawns so only one avatar
	// is created per remote player.
	async function spawnRemote(state: PlayerState) {
		if (remotePlayers.has(state.id) || spawningRemote.has(state.id)) return;
		spawningRemote.add(state.id);
		try {
			const root = await loadAvatarInto(scene, `remote-${state.id}`);
			const rp = new RemotePlayer(state.id, root, new Vector3(state.x, state.y, state.z), state.ry);
			remotePlayers.set(state.id, rp);
		} finally {
			spawningRemote.delete(state.id);
		}
	}

	network.onWelcome = (selfId, players) => {
		// for (const p of players) {
		// 	if (p.id !== selfId) void spawnRemote(p);
		// }
	};
	network.onJoin = (p) => {
		if (p.id !== network.selfId) void spawnRemote(p);
	};
	network.onLeave = (id) => {
		remotePlayers.get(id)?.dispose();
		remotePlayers.delete(id);
	};
	network.onState = (players) => {
		for (const p of players) {
			if (p.id === network.selfId) continue;
			const rp = remotePlayers.get(p.id);
			if (rp) rp.setTarget(new Vector3(p.x, p.y, p.z), p.ry);
			else void spawnRemote(p);
		}
	};

	network.connect(opts.serverUrl, gameId, opts.playerName);

	// --- Game loop ---
	scene.onBeforeRenderObservable.add(() => {
		// Rigid follow — run BEFORE the dt guard so the camera tracks the
		// player on every single frame, no exceptions. IMPORTANT: we mutate
		// camera.target directly instead of calling camera.setTarget().
		// ArcRotateCamera.setTarget() keeps the camera's world position fixed
		// and only re-points alpha/beta at the new target — the camera never
		// moves closer to the player, letting the character walk into it.
		// Mutating .target makes _update() recompute the position from
		// alpha/beta/radius around the player, giving true ROBLOX-style
		// follow at a constant orbit distance.
		camera.target.copyFrom(player.position.add(new Vector3(0, 1.4, 0)));

		const dt = engine.getDeltaTime() / 1000;
		if (dt <= 0 || dt > 0.25) return; // skip huge stalls (tab backgrounded, etc.)

		player.update(dt);

		network.sendUpdate(player.position.x, player.position.y, player.position.z, player.facing);

		for (const rp of remotePlayers.values()) rp.update(dt);
	});

	engine.runRenderLoop(() => scene.render());
	const onResize = () => engine.resize();
	window.addEventListener('resize', onResize);

	return {
		dispose: () => {
			window.removeEventListener('resize', onResize);
			network.disconnect();
			input.dispose();
			for (const rp of remotePlayers.values()) rp.dispose();
			player.dispose();
			engine.dispose();
		}
	};
}
