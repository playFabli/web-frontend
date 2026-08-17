/**
 * Lazily-loaded 3D avatar rendering for the arena.
 *
 * Everything here needs Babylon.js, which is several MB of JavaScript. The
 * arena pages import this module statically (it's tiny), but Babylon itself
 * is only `import()`ed once an avatar actually has to render. That keeps
 * `/arena` and `/arena/match` from blocking their first paint on the 3D
 * engine download + parse just to show stats, match state and combat UI.
 */
import type { AbstractMesh, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import { page } from '$app/state';
import { config } from '$lib/config';

export interface AvatarPreviewOptions {
	userId?: number | string;
	token?: string;
	onError?: (msg: string) => void;
}

// The user's saved body colors. GET /api/user/avatar/colors returns these
// as hex strings (defaults: skin #D9C5B2, torso #556B8E, legs #4A4A4A).
interface AvatarColors {
	left_arm_color?: string;
	right_arm_color?: string;
	torso_color?: string;
	left_leg_color?: string;
	right_leg_color?: string;
	head_color?: string;
}

const DEFAULT_AVATAR_COLORS: AvatarColors = {
	left_arm_color: '#D9C5B2',
	right_arm_color: '#D9C5B2',
	torso_color: '#556B8E',
	left_leg_color: '#4A4A4A',
	right_leg_color: '#4A4A4A',
	head_color: '#D9C5B2'
};

// Mesh-name keywords used to route parts of the base avatar. The
// placeholder names its parts part_0_Legs .. part_5_Skin, so real models
// (Head/Torso/Legs/Arms objects) are covered by the same keywords.
const BODY_PART_KEYWORDS: Record<string, string[]> = {
	head: ['head', 'face'],
	torso: ['torso', 'shirt', 'chest'],
	left_leg: ['left_leg', 'leg_l'],
	right_leg: ['right_leg', 'leg_r'],
	legs: ['leg', 'pant'],
	left_arm: ['left_arm', 'arm_l', 'leftarm'],
	right_arm: ['right_arm', 'arm_r', 'rightarm'],
	arms: ['arm']
};

function findBodyMeshes(meshes: AbstractMesh[], part: string): AbstractMesh[] {
	const keywords = BODY_PART_KEYWORDS[part] ?? [part];
	return meshes.filter((mesh) =>
		keywords.some((keyword) => mesh.name.toLowerCase().includes(keyword))
	);
}

function meshCenter(mesh: AbstractMesh): { x: number; y: number } {
	mesh.computeWorldMatrix(true);
	const center = mesh.getBoundingInfo().boundingBox.centerWorld;
	return { x: center.x, y: center.y };
}

/**
 * Resolve which base-avatar meshes belong to a body part. Mesh names are
 * checked first; blocky avatars sharing one skin/legs material (the
 * placeholder) fall back to a bounding-box split - the head is the topmost
 * skin mesh and left/right parts are split by X sign.
 */
function bodyPartMeshes(body: AbstractMesh[], part: string): AbstractMesh[] {
	const byName = findBodyMeshes(body, part);
	if (byName.length > 0) return byName;

	if (part === 'head' || part === 'left_arm' || part === 'right_arm') {
		const skin = body.filter((mesh) => mesh.name.toLowerCase().includes('skin'));
		if (skin.length === 0) return [];

		const positioned = skin.map((mesh) => ({ mesh, ...meshCenter(mesh) }));
		const head = positioned.reduce((a, b) => (b.y > a.y ? b : a));
		if (part === 'head') return [head.mesh];

		return positioned
			.filter(
				(entry) => entry.mesh !== head.mesh && (part === 'left_arm' ? entry.x < 0 : entry.x > 0)
			)
			.map((entry) => entry.mesh);
	}

	if (part === 'left_leg' || part === 'right_leg') {
		const legs = findBodyMeshes(body, 'legs');
		if (legs.length === 0) return [];

		return legs.filter((mesh) => {
			const { x } = meshCenter(mesh);
			return part === 'left_leg' ? x < 0 : x > 0;
		});
	}

	return [];
}

// Map a manifest slot (parts_affected) to a canonical body part.
function bodyPartForSlot(slot: string): string | null {
	const s = slot.toLowerCase();
	if (s.includes('head') || s.includes('face')) return 'head';
	if (s.includes('torso') || s.includes('chest') || s.includes('shirt')) return 'torso';
	if (s.includes('left') && s.includes('leg')) return 'left_leg';
	if (s.includes('right') && s.includes('leg')) return 'right_leg';
	if (s.includes('leg') || s.includes('pant')) return 'legs';
	if (s.includes('left') && s.includes('arm')) return 'left_arm';
	if (s.includes('right') && s.includes('arm')) return 'right_arm';
	if (s.includes('arm')) return 'arms';
	return null;
}

// Shape of each wearing entry returned by GET /api/arena/avatar
// (see the Arena\GeneralController manifest() method).
interface WornItem {
	item_id: number;
	title: string;
	category: string;
	slots: string[];
	model_url: string | null;
	texture: string | null;
}
/**
 * Create a Babylon engine + scene that renders a single 3D avatar preview
 * onto `canvas` for `userId` (defaults to the current user) and return a
 * dispose function. Babylon.js itself is loaded lazily on first call; Vite
 * caches the dynamic-import promise so every later preview on the page (or
 * after navigation) reuses the already-loaded module.
 */
export async function mountAvatarPreview(
	canvas: HTMLCanvasElement,
	opts: AvatarPreviewOptions = {}
): Promise<() => void> {
	if (!canvas) return () => {};

	const { userId, token, onError } = opts;

	// Babylon.js is huge - load it on demand so the arena pages render
	// their HTML/state before the 3D engine chunk downloads.
	const BABYLON = await import('@babylonjs/core');
	await import('@babylonjs/loaders/glTF');
	await import('@babylonjs/loaders/OBJ');

	const {
		Engine,
		ImportMeshAsync,
		Scene,
		ArcRotateCamera,
		TransformNode,
		Vector3,
		Color3,
		Color4,
		HemisphericLight,
		DefaultRenderingPipeline,
		StandardMaterial,
		Texture
	} = BABYLON;

	// @babylonjs/core 9.x ships engine typings where a leaked fragment inside
	// `abstractEngine.pure.d.ts` swallows several members declared after it, so
	// TypeScript doesn't see these (very real, runtime) Engine methods. Declare
	// them explicitly so the lazy mount type-checks.
	type EngineWithRuntimeExtras = InstanceType<typeof Engine> & {
		setHardwareScalingLevel(level: number): void;
		runRenderLoop(renderFunction: () => void): void;
		resize(forceSetSize?: boolean): void;
	};

	// Paint the base avatar with the user's saved colors. Texture-only worn
	// items (shirt/pants) override their part afterwards, so without clothing
	// the avatar's own colours are what shows.
	function applyAvatarColors(scene: Scene, body: AbstractMesh[], colors: AvatarColors): void {
		const paint = (part: string, hex: string | undefined) => {
			if (!hex) return;
			const color = Color3.FromHexString(hex);
			for (const mesh of bodyPartMeshes(body, part)) {
				const material = new StandardMaterial(`body_color_${part}`, scene);
				material.diffuseColor = color;
				material.specularColor = new Color3(0, 0, 0);
				mesh.material = material;
			}
		};

		paint('head', colors.head_color);
		paint('left_arm', colors.left_arm_color);
		paint('right_arm', colors.right_arm_color);
		paint('torso', colors.torso_color);
		paint('left_leg', colors.left_leg_color);
		paint('right_leg', colors.right_leg_color);
	}
	async function loadWornItem(
		scene: Scene,
		item: WornItem,
		root: TransformNode,
		body: AbstractMesh[]
	): Promise<void> {
		// Items with a 3D model (hats, gears, ...) load as their own OBJ and
		// are layered straight onto the avatar.
		if (item.model_url) {
			const url = `${config.api}/${item.model_url}.obj`;

			try {
				const result = await ImportMeshAsync(url, scene);
				result.meshes.forEach((mesh) => {
					if (mesh.name === '__root__') return;
					mesh.parent = root;
					mesh.isPickable = false;
					mesh.receiveShadows = true;

					if (item.texture) {
						const material = new StandardMaterial(`worn_${item.item_id}`, scene);
						material.diffuseTexture = new Texture(`${config.api}/${item.texture}`, scene);
						material.specularColor = new Color3(0, 0, 0);
						mesh.material = material;
					}
				});

				// Gears are held in the avatar's left hand. Rotate the left arm
				// into the "holding" pose the backend renderer applies (see
				// User\GeneralController::renderAvatar, which rotates left_arm by
				// x=90° / y=-90° / z=0°) so the blocky arm matches the gear model
				// instead of floating separate from the hand.
				if (item.category?.toLowerCase() === 'gears' && !leftArmPosedForGear) {
					leftArmPosedForGear = true;
					poseLeftArmForGear(body);
				}
			} catch (err) {
				console.error(`Failed to load worn item ${item.item_id}:`, err);
			}
			return;
		}

		// Texture-only items (faces, shirts, pants) are painted onto the
		// matching body part of the base avatar. Parts that have no texture
		// coordinates are left with the body colour they were already painted
		// with - sampling the texture at UV (0,0) would turn them black.
		if (!item.texture || body.length === 0) return;

		for (const slot of item.slots ?? []) {
			const part = bodyPartForSlot(slot);
			if (!part) continue;

			for (const mesh of bodyPartMeshes(body, part)) {
				const hasUVs = (mesh.getVerticesData('uv')?.length ?? 0) > 0;

				// Clothing (shirt/pants): the texture replaces the body colour.
				if (part !== 'head') {
					if (!hasUVs) continue;
					const material = new StandardMaterial(`body_${part}_${item.item_id}`, scene);
					material.diffuseColor = new Color3(1, 1, 1);
					material.diffuseTexture = new Texture(`${config.api}/${item.texture}`, scene);
					material.specularColor = new Color3(0, 0, 0);
					mesh.material = material;
					continue;
				}

				// Face: keep the coloured head underneath and overlay the
				// transparent face texture on top, so the head colour stays
				// visible through the face's transparent areas.
				if (!hasUVs) continue;
				const overlay = mesh.clone(`face_overlay_${item.item_id}_${mesh.name}`, mesh.parent);
				if (!overlay) continue;
				overlay.isPickable = false;
				overlay.receiveShadows = true;

				const faceMat = new StandardMaterial(`face_${item.item_id}_${mesh.name}`, scene);
				faceMat.diffuseColor = new Color3(1, 1, 1);
				faceMat.diffuseTexture = new Texture(`${config.api}/${item.texture}`, scene);
				faceMat.diffuseTexture.hasAlpha = true;
				faceMat.specularColor = new Color3(0, 0, 0);
				overlay.material = faceMat;
			}
		}
	}
// Once a gear is worn, the left arm is posed to match the backend renderer
	// (GeneralController::renderAvatar). Guarded so multiple gears/worn items
	// never double-apply the rotation.
	let leftArmPosedForGear = false;

	/**
	 * World-space point at the top of a limb, nearest the torso. Rotating a
	 * limb around this keeps the shoulder locked while the rest of the arm
	 * swings into the holding pose.
	 */
	function shoulderPivot(mesh: AbstractMesh): Vector3 {
		mesh.computeWorldMatrix(true);
		const vectors = mesh.getBoundingInfo().boundingBox.vectorsWorld;
		let pivot = vectors[0];
		for (const v of vectors) {
			if (
				v.y > pivot.y + 1e-4 ||
				(Math.abs(v.y - pivot.y) < 1e-4 && Math.abs(v.x) < Math.abs(pivot.x))
			) {
				pivot = v;
			}
		}
		return pivot.clone();
	}

	// Mirror User\GeneralController::renderAvatar: when a gear is held, rotate
	// the left arm by x=90°, y=-90°, z=0° (in radians) around its shoulder so
	// the arm visually holds the gear model that sits in the hand. The order
	// and pivot mimic the backend's Blender renderer (setPosition then rotate).
	function poseLeftArmForGear(body: AbstractMesh[]): void {
		const arms = bodyPartMeshes(body, 'left_arm');
		if (arms.length === 0) return;

		// Use negated angles to match Blender's right-hand rule convention
		// against Babylon's left-hand/default coordinate system.
		const xRad = -Math.PI / 2; // -90° (backend: 90°)
		const yRad = Math.PI / 2; // 90° (backend: -90°)

		for (const arm of arms) {
			// Set the arm's local Euler rotation matching the backend,
			// with signs flipped to account for coordinate system differences.
			// The arm mesh is a descendant of the avatar root, so its rotation
			// pivots around the avatar's shoulder joint.
			arm.rotation.x = -xRad;
			arm.rotation.y = yRad;

			arm.position.z += 2.05;
			arm.position.y += 2.65;
			arm.position.x -= 1;
			// z stays at 0 (default; not set explicitly)
		}
	}
	/**
	 * The avatar showcase runs in its own Babylon scene. The base body is the
	 * placeholder /models/avatar.obj, then every currently-worn item is layered
	 * on top: model items (hats, gears) load their own OBJ, while texture-only
	 * items (faces, shirts, pants) are painted onto the matching body part
	 * using the temporary routes from routes/api.php:
	 *
	 *   GET /api/arena/avatar                        -> { data, session }
	 *   GET /api/arena/model/{session}/{itemId}.obj  -> item's OBJ (mtl stripped)
	 *   GET /api/arena/texture/{session}/{itemId}    -> item's texture image
	 *
	 * Each worn model's texture is streamed through its own temporary route
	 * and assigned straight onto the mesh material.
	 */
	function setupAvatarPreview(
		scene: Scene,
		canvas: HTMLCanvasElement,
		userId?: number | string,
		token?: string,
		reportError?: (msg: string) => void
	): void {
		const authToken = (token ?? page.data.token) as string;
		const handleError = reportError ?? ((msg: string) => console.error(msg));
		// Authenticated user is the default; an explicit userId lets the caller
		// materialise any user's outfit (e.g. the robot opponent, user id 2).
		const targetUserId = userId ?? (page.data.user?.id as number);
		const root = new TransformNode('avatarRoot', scene);

		// Slightly elevated orbit so the whole outfit is visible at once.
		const camera = new ArcRotateCamera(
			'avatarCamera',
			-Math.PI / 2,
			1.15,
			6,
			new Vector3(0, 1.4, 0),
			scene
		);
		camera.attachControl(canvas, true);
		camera.lowerRadiusLimit = 2;
		camera.upperRadiusLimit = 40;
		camera.wheelPrecision = 40;

		const pipeline = new DefaultRenderingPipeline('defaultPipeline', true, scene, [camera]);
		pipeline.samples = 4;
		pipeline.fxaaEnabled = false;

		const ambient = new HemisphericLight('avatarAmbient', new Vector3(0, 1, 0), scene);
		ambient.diffuse = new Color3(0.85, 0.9, 1);
		ambient.groundColor = new Color3(0.8, 0.8, 0.8);
		ambient.intensity = 1;

		// Turn the avatar so it's always looking straight at the camera.
		scene.onBeforeRenderObservable.add(() => {
			root.rotation.y = camera.alpha;
		});

		// Frame the finished avatar so it's fully in view. Runs while models
		// stream in (and for a couple of seconds after) so the camera settles
		// on the bounding box of the assembled outfit.
		let framesFramed = 0;
		const MAX_FRAMING_FRAMES = 300;
		const frameObserver = scene.onBeforeRenderObservable.add(() => {
			const meshes = root.getChildMeshes();
			if (meshes.length === 0) return;

			meshes.forEach((mesh) => mesh.computeWorldMatrix(true));
			const { min, max } = root.getHierarchyBoundingVectors(true);
			const center = min.add(max).scale(0.5);
			const size = Math.max(max.x - min.x, max.y - min.y, max.z - min.z);

			if (size > 0) {
				const aspect = scene.getEngine().getAspectRatio(camera);
				const halfFovY = camera.fov / 2;
				const halfFovX = Math.atan(Math.tan(camera.fov / 2) * aspect);
				const distance = size / 2 / Math.tan(Math.min(halfFovX, halfFovY));

				camera.target.copyFrom(center);
				camera.radius = distance * 1.3;
			}

			framesFramed += 1;
			if (framesFramed >= MAX_FRAMING_FRAMES) {
				scene.onBeforeRenderObservable.remove(frameObserver);
			}
		});
		// Base placeholder body. Resolves to the body's part meshes so texture-only
		// items (faces, shirts, pants) can be painted onto the matching part.
		const baseMeshes = ImportMeshAsync('/models/avatar.obj', scene)
			.then((result) =>
				result.meshes.filter((mesh) => {
					if (mesh.name === '__root__') return false;
					mesh.parent = root;
					mesh.isPickable = false;
					mesh.receiveShadows = false;
					return true;
				})
			)
			.then((body) =>
				ImportMeshAsync('/models/pedestal.obj', scene)
					.then((mtlResult) => {
						mtlResult.meshes.forEach((mesh) => {
							if (mesh.name === '__root__') return;
							mesh.parent = root;
							mesh.isPickable = false;
							mesh.receiveShadows = false;
						});
					})
					.catch((err) => {
						console.error('Failed to load pedestal /models/pedestal.obj:', err);
					})
					.then(() => body)
			)
			.catch((err) => {
				console.error('Failed to load base avatar /models/avatar.obj:', err);
				return [];
			});

		// The user's saved body colors feed the base avatar wherever no worn
		// clothing covers it, and the face overlays the head colour.
		const colors = fetch(`${config.api}/user/avatar/colors?user_id=${targetUserId}`, {
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${authToken}`
			}
		})
			.then((res) => res.json())
			.then((json) => (json?.data ?? DEFAULT_AVATAR_COLORS) as AvatarColors)
			.catch(() => DEFAULT_AVATAR_COLORS);

		// Current wearing manifest - the face, shirt & pants, hats, and gear.
		fetch(`${config.api}/arena/avatar?user_id=${targetUserId}`, {
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${authToken}`
			}
		})
			.then((res) => res.json())
			.then((manifest: { data?: WornItem[] }) => {
				return Promise.all([baseMeshes, colors, Promise.resolve(manifest?.data ?? [])]).then(
					([body, avatarColors, items]) => {
						applyAvatarColors(scene, body, avatarColors);
						return Promise.all(items.map((item) => loadWornItem(scene, item, root, body)));
					}
				);
			})
			.catch((err) => {
				console.error('Failed to load arena avatar manifest:', err);
				handleError('Could not load your avatar.');
			});
	}

	canvas.style.imageRendering = 'pixelated';
	canvas.style.imageRendering = 'crisp-edges';

	const engine = new Engine(canvas, true, {
		alpha: true,
		premultipliedAlpha: false,
		adaptToDeviceRatio: true,
		antialias: true
	}) as EngineWithRuntimeExtras;
	const scene = new Scene(engine);
	scene.clearColor = new Color4(0, 0, 0, 0);
	scene.skipPointerMovePicking = true;
	scene.ambientColor = new Color3(0.8, 0.8, 0.8);

	setupAvatarPreview(scene, canvas, userId, token, onError);
	engine.setHardwareScalingLevel(1.0);

	engine.runRenderLoop(() => {
		scene.render();
	});

	const handleResize = () => engine.resize();
	window.addEventListener('resize', handleResize);

	return () => {
		window.removeEventListener('resize', handleResize);
		scene.dispose();
		engine.dispose();
	};
}
