<script lang="ts">
	import {
		Engine,
		ImportMeshAsync,
		Scene,
		TargetCamera,
		ArcRotateCamera,
		TransformNode,
		Vector3,
		Color3,
		Color4,
		HemisphericLight,
		DirectionalLight,
		ShadowGenerator,
		DefaultRenderingPipeline,
		ImageProcessingConfiguration,
		ColorCurves,
		RenderTargetTexture,
		StandardMaterial,
		Texture,

		CubeTexture,

		ParticleSystem,

		Tools



	} from "@babylonjs/core";
	import "@babylonjs/loaders/glTF";
	import "@babylonjs/loaders/OBJ";
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { config } from "$lib/config";
	import type { AbstractMesh } from "@babylonjs/core";
	import { DoorOpen, Hourglass } from "lucide-svelte";

	let avatarCanvas: HTMLCanvasElement = $state();
	let avatarError = $state<string | null>(null);
	let youAvatarCanvas: HTMLCanvasElement = $state();
	let robotAvatarCanvas: HTMLCanvasElement = $state();
	let youAvatarDispose: (() => void) | null = null;
	let robotAvatarDispose: (() => void) | null = null;

	// Live arena stats returned by GET /api/arena/stats.
	interface ArenaStats {
		attack: number;
		defense: number;
		max_hp: number;
		arena_tokens: number;
		arena_exp: number;
		online: number;
	}
	let arenaStats = $state<ArenaStats | null>(null);
	let entering = $state(false);
	let enterError = $state<string | null>(null);

	// Matchmaking modal flow.
		interface FighterPreview {
		name: string;
		username?: string;
		attack: number;
		defense: number;
		max_hp: number;
	}

	interface MatchPreview {
		id: number;
		status: string;
		is_robot: boolean;
		opponent_name: string;
		player: FighterPreview;
		opponent: FighterPreview;
	}

	let showMatchmakingModal = $state(false);
	let findingOpponent = $state(false);
	let foundMatch = $state<MatchPreview | null>(null);
	let modalError = $state<string | null>(null);

	function openMatchmakingModal() {
		showMatchmakingModal = true;
		findingOpponent = true;
		foundMatch = null;
		modalError = null;
	}

	function closeMatchmakingModal() {
		showMatchmakingModal = false;
		findingOpponent = false;
		foundMatch = null;
		modalError = null;
	}

// Mount the two 3D avatar thumbnails in the matchmaking modal once the
// opponent is revealed. The You card renders the current user's avatar;
// the Robot card renders user id 2's avatar. Each preview is disposed
// automatically when the matchup clears or the canvases rebind.
$effect(() => {
	if (!foundMatch || !youAvatarCanvas || !robotAvatarCanvas) {
		return;
	}

	const token = page.data.token as string;
	youAvatarDispose?.();
	robotAvatarDispose?.();
	youAvatarDispose = mountAvatarEngine(youAvatarCanvas, undefined, token);
	robotAvatarDispose = mountAvatarEngine(robotAvatarCanvas, 2, token);

	return () => {
		youAvatarDispose?.();
		robotAvatarDispose?.();
		youAvatarDispose = null;
		robotAvatarDispose = null;
	};
});
	function startFight() {
		if (!foundMatch) return;
		goto("/arena/match");
	}

	onMount(() => {
		const token = page.data.token as string;
		fetch(`${config.api}/arena/stats`, {
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		})
			.then((res) => (res.ok ? res.json() : null))
			.then((json) => {
				if (json?.data) arenaStats = json.data;
			})
			.catch(() => {});
	});

	async function enterArena() {
		if (entering) return;
		entering = true;
		enterError = null;
		openMatchmakingModal();
		try {
			const res = await fetch(`${config.api}/arena/queue`, {
				method: "POST",
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${page.data.token}`,
				},
			});
			if (!res.ok) {
				const json = await res.json().catch(() => null);
				modalError = json?.message || "Could not find an opponent right now.";
				findingOpponent = false;
				return;
			}
			const json = await res.json();
			foundMatch = json.data;
			// Keep the spinner going for 1-3 seconds before revealing the matchup.
			const waitMs = 1000 + Math.random() * 2000;
			await new Promise((resolve) => setTimeout(resolve, waitMs));
			findingOpponent = false;
		} catch (err) {
			modalError = "Could not reach the arena.";
			findingOpponent = false;
		} finally {
			entering = false;
		}
	}

	// Rough phone/tablet check so we can pick a quality tier. Doesn't need to
	// be bulletproof - it's just choosing between "cheap" and "nice" settings.
	function isMobileDevice(): boolean {
		const ua = navigator.userAgent;
		const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
		return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || coarsePointer;
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
	 * The avatar showcase runs in its own Babylon scene inside the small
	 * "Your Avatar" box. The base body is the placeholder /models/avatar.obj,
	 * then every currently-worn item is layered on top: model items (hats,
	 * gears) load their own OBJ, while texture-only items (faces, shirts,
	 * pants) are painted onto the matching body part using the temporary
	 * routes from routes/api.php:
	 *
	 *   GET /api/arena/avatar                        -> { data, session }
	 *   GET /api/arena/model/{session}/{itemId}.obj  -> item's OBJ (mtl stripped)
	 *   GET /api/arena/texture/{session}/{itemId}    -> item's texture image
	 *
	 * Each worn model's texture is streamed through its own temporary route
	 * and assigned straight onto the mesh material.
	 */
	function setupAvatarPreview(scene: Scene, canvas: HTMLCanvasElement, userId?: number | string, token?: string, onError?: (msg: string) => void): void {
		const authToken = (token ?? page.data.token) as string;
		const reportError = onError ?? ((msg: string) => { avatarError = msg; });
		// Authenticated user is the default; an explicit userId lets the caller
		// materialise any user's outfit (e.g. the robot opponent, user id 2).
		const targetUserId = userId ?? (page.data.user?.id as number);
		const root = new TransformNode("avatarRoot", scene);

		// Slightly elevated orbit so the whole outfit is visible at once.
		const camera = new ArcRotateCamera(
			"avatarCamera",
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

		const pipeline = new DefaultRenderingPipeline(
			"defaultPipeline", // Имя конвейера
			true,              // Использовать HDR
			scene,             // Ваша сцена
			[camera]           // Список камер
		);

		// Вариант А: Включение MSAA (Multi-Sample Anti-Aliasing) — дает отличные грани
		pipeline.samples = 4; // Рекомендуемые значения: 4 или 8 (зависит от мощности GPU)

		// Вариант Б: Включение FXAA (Fast Approximate Anti-Aliasing) — быстрое размытие пикселей
		pipeline.fxaaEnabled = false; 

		const ambient = new HemisphericLight("avatarAmbient", new Vector3(0, 1, 0), scene);
		ambient.diffuse = new Color3(0.85, 0.9, 1);
		ambient.groundColor = new Color3(0.8, 0.8, 0.8);
		ambient.intensity = 1;

		// const key = new DirectionalLight("avatarKey", new Vector3(-1, -2, -0.5), scene);
		// key.diffuse = new Color3(1, 0.96, 0.88);
		// key.intensity = 1.6;

		// Turn the avatar so it's always looking straight at the camera.
		// Forward (local +Z at rotation 0) matches the game controller's
		// atan2(moveDir.x, moveDir.z) convention; the orbit camera sits at
		// `alpha` around the target, so rotation.y = alpha aims +Z at it.
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

			meshes.forEach((mesh) => mesh.computeWorldMatrix(true, true));
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
		// items (faces, shirts, pants) can be painted onto the matching part. If
		// /models/avatar.obj isn't in place yet it resolves to [] and those
		// layers are skipped (model items still load on top).
		const baseMeshes = ImportMeshAsync("/models/avatar.obj", scene)
			.then((result) =>
				result.meshes.filter((mesh) => {
					if (mesh.name === "__root__") return false;
					mesh.parent = root;
					mesh.isPickable = false;
					mesh.receiveShadows = false;
					return true;
				})
			)
			.then((body) =>
				ImportMeshAsync("/models/pedestal.obj", scene)
					.then((mtlResult) => {
						mtlResult.meshes.forEach((mesh) => {
							if (mesh.name === "__root__") return;
							mesh.parent = root;
							mesh.isPickable = false;
							mesh.receiveShadows = false;
						});
					})
					.catch((err) => {
						console.error("Failed to load pedestal /models/pedestal.obj:", err);
					})
					.then(() => body)
			)
			.catch((err) => {
				console.error("Failed to load base avatar /models/avatar.obj:", err);
				return [];
			});

		// The user's saved body colors feed the base avatar wherever no worn
		// clothing covers it, and the face overlays the head colour.
		const colors = fetch(`${config.api}/user/avatar/colors?user_id=${targetUserId}`, {
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${authToken}`,
			},
		})
			.then((res) => res.json())
			.then((json) => (json?.data ?? DEFAULT_AVATAR_COLORS) as AvatarColors)
			.catch(() => DEFAULT_AVATAR_COLORS);

		// Current wearing manifest - the face, shirt & pants, hats, and gear.
		fetch(`${config.api}/arena/avatar?user_id=${targetUserId}`, {
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${authToken}`,
			},
		})
			.then((res) => res.json())
			.then((manifest) => {
				return Promise.all([baseMeshes, colors, Promise.resolve(manifest?.data ?? [])]).then(
					([body, avatarColors, items]) => {
						applyAvatarColors(scene, body, avatarColors);
						return Promise.all(items.map((item) => loadWornItem(scene, item, root, body)));
					}
				);
			})
			.catch((err) => {
				console.error("Failed to load arena avatar manifest:", err);
				reportError("Could not load your avatar.");
			});
	}


/**
 * Create a throwaway Babylon engine + scene that renders a single 3D avatar
 * preview onto `canvas` for `userId` (defaults to the current user). Mirrors
 * the lobby showcase, but is lightweight and explicitly disposeable - which
 * the matchmaking modal needs for its You/Robot thumbnails.
 */
function mountAvatarEngine(canvas: HTMLCanvasElement, userId?: number | string, token?: string): () => void {
	if (!canvas) return () => {};
	canvas.style.imageRendering = "pixelated";
	canvas.style.imageRendering = "crisp-edges";
	const engine = new Engine(canvas, true, {
		alpha: true,
		premultipliedAlpha: false,
		adaptToDeviceRatio: true,
		antialias: true,
	});
	const scene = new Scene(engine);
	scene.clearColor = new Color4(0, 0, 0, 0);
	scene.skipPointerMovePicking = true;
	scene.ambientColor = new Color3(0.8, 0.8, 0.8);

	setupAvatarPreview(scene, canvas, userId, token, () => {});
	engine.setHardwareScalingLevel(1.0);

	engine.runRenderLoop(() => {
		scene.render();
	});

	const handleResize = () => engine.resize();
	window.addEventListener("resize", handleResize);

	return () => {
		window.removeEventListener("resize", handleResize);
		scene.dispose();
		engine.dispose();
	};
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
		left_arm_color: "#D9C5B2",
		right_arm_color: "#D9C5B2",
		torso_color: "#556B8E",
		left_leg_color: "#4A4A4A",
		right_leg_color: "#4A4A4A",
		head_color: "#D9C5B2",
	};

	// Mesh-name keywords used to route parts of the base avatar. The
	// placeholder names its parts part_0_Legs .. part_5_Skin, so real models
	// (Head/Torso/Legs/Arms objects) are covered by the same keywords.
	const BODY_PART_KEYWORDS: Record<string, string[]> = {
		head: ["head", "face"],
		torso: ["torso", "shirt", "chest"],
		left_leg: ["left_leg", "leg_l"],
		right_leg: ["right_leg", "leg_r"],
		legs: ["leg", "pant"],
		left_arm: ["left_arm", "arm_l", "leftarm"],
		right_arm: ["right_arm", "arm_r", "rightarm"],
		arms: ["arm"],
	};

	function findBodyMeshes(meshes: AbstractMesh[], part: string): AbstractMesh[] {
		const keywords = BODY_PART_KEYWORDS[part] ?? [part];
		return meshes.filter((mesh) =>
			keywords.some((keyword) => mesh.name.toLowerCase().includes(keyword))
		);
	}

	function meshCenter(mesh: AbstractMesh): { x: number; y: number } {
		mesh.computeWorldMatrix(true, true);
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

		if (part === "head" || part === "left_arm" || part === "right_arm") {
			const skin = body.filter((mesh) => mesh.name.toLowerCase().includes("skin"));
			if (skin.length === 0) return [];

			const positioned = skin.map((mesh) => ({ mesh, ...meshCenter(mesh) }));
			const head = positioned.reduce((a, b) => (b.y > a.y ? b : a));
			if (part === "head") return [head.mesh];

			return positioned
				.filter(
					(entry) =>
						entry.mesh !== head.mesh && (part === "left_arm" ? entry.x < 0 : entry.x > 0)
				)
				.map((entry) => entry.mesh);
		}

		if (part === "left_leg" || part === "right_leg") {
			const legs = findBodyMeshes(body, "legs");
			if (legs.length === 0) return [];

			return legs.filter((mesh) => {
				const { x } = meshCenter(mesh);
				return part === "left_leg" ? x < 0 : x > 0;
			});
		}

		return [];
	}

	// Map a manifest slot (parts_affected) to a canonical body part.
	function bodyPartForSlot(slot: string): string | null {
		const s = slot.toLowerCase();
		if (s.includes("head") || s.includes("face")) return "head";
		if (s.includes("torso") || s.includes("chest") || s.includes("shirt")) return "torso";
		if (s.includes("left") && s.includes("leg")) return "left_leg";
		if (s.includes("right") && s.includes("leg")) return "right_leg";
		if (s.includes("leg") || s.includes("pant")) return "legs";
		if (s.includes("left") && s.includes("arm")) return "left_arm";
		if (s.includes("right") && s.includes("arm")) return "right_arm";
		if (s.includes("arm")) return "arms";
		return null;
	}

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

		paint("head", colors.head_color);
		paint("left_arm", colors.left_arm_color);
		paint("right_arm", colors.right_arm_color);
		paint("torso", colors.torso_color);
		paint("left_leg", colors.left_leg_color);
		paint("right_leg", colors.right_leg_color);
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
					if (mesh.name === "__root__") return;
					mesh.parent = root;
					mesh.isPickable = false;
					mesh.receiveShadows = true;

					if (item.texture) {
						console.log(`Applying texture for worn item ${item.item_id} (${item.category})`);
						const material = new StandardMaterial(`worn_${item.item_id}`, scene);
						material.diffuseTexture = new Texture(`${config.api}/${item.texture}`, scene);
						material.specularColor = new Color3(0, 0, 0);
						mesh.material = material;
					}
				});
			} catch (err) {
				console.error(`Failed to load worn item ${item.item_id} (${item.category}):`, err);
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
				const hasUVs = (mesh.getVerticesData("uv")?.length ?? 0) > 0;

				// Clothing (shirt/pants): the texture replaces the body colour.
				if (part !== "head") {
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
				const overlay = mesh.clone(`face_overlay_${item.item_id}_${mesh.name}`);
				overlay.parent = mesh.parent;
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


	// Separate, lighter Babylon scene for the avatar showcase box.
	onMount(() => {
		avatarCanvas.style.imageRendering = "pixelated";
		avatarCanvas.style.imageRendering = "crisp-edges";
		const avatarEngine = new Engine(avatarCanvas, true, {
			alpha: true,
			premultipliedAlpha: false,
			adaptToDeviceRatio: true,
			antialias: true
		});
		const avatarScene = new Scene(avatarEngine);
		avatarScene.clearColor = new Color4(0, 0, 0, 0);
		avatarScene.skipPointerMovePicking = true;

		avatarScene.ambientColor = new Color3(0.8, 0.8, 0.8);

		
		setupAvatarPreview(avatarScene, avatarCanvas);
		avatarEngine.setHardwareScalingLevel(1.0);

		avatarEngine.runRenderLoop(() => {
			avatarScene.render();
		});

		const handleResize = () => avatarEngine.resize();
		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
			avatarScene.dispose();
			avatarEngine.dispose();
		};
	});
</script>

<main class="py-6">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<div class="grid grid-cols-12 gap-4">
			<div class="col-span-1"></div>
			<div class="col-span-8">
				<h1 class="font-bold text-xl">Arena</h1>
			</div>
			<div class="col-span-2 text-right font-bold">
				<p><Hourglass strokeWidth="3" class="inline mb-1 size-4"/> 14 days left!</p>
			</div>
			<div class="col-span-1"></div>

			<div class="col-span-1"></div>
			<div class="col-span-10">
				<div class="border border-gray-200 p-3 rounded-lg mb-3">
					<div class="grid grid-cols-3 gap-4 mb-3">
						<div class="col-span-1 text-center">
							<p class="text-gray-500/70">Rank</p>
							<p class="text-xl text-primary font-bold">Knight I</p>
						</div>
						<div class="col-span-1 text-center">
							<p class="text-gray-500/70">Arena XP</p>
							<p class="text-xl text-primary font-bold">{arenaStats?.arena_exp ?? '—'}</p>
						</div>
						<div class="col-span-1 text-center">
						<p class="text-gray-500/70">Tokens</p>
							<p class="text-xl text-primary font-bold">{arenaStats?.arena_tokens ?? '—'}</p>
						</div>
					</div>
					<div class="grid grid-cols-3 gap-4 mb-3">
						<div class="col-span-1 text-center">
							<p class="text-gray-500/70 text-sm">ATK</p>
							<p class="text-lg font-bold text-primary">{arenaStats?.attack ?? '—'}</p>
						</div>
						<div class="col-span-1 text-center">
							<p class="text-gray-500/70 text-sm">DEF</p>
							<p class="text-lg font-bold text-primary">{arenaStats?.defense ?? '—'}</p>
						</div>
						<div class="col-span-1 text-center">
							<p class="text-gray-500/70 text-sm">Max HP</p>
							<p class="text-lg font-bold text-primary">{arenaStats?.max_hp ?? '—'}</p>
						</div>
					</div>
					<div class="w-full bg-gray-100 rounded-lg relative mb-3">
						<canvas bind:this={avatarCanvas} class="avatar-canvas"></canvas>
						{#if avatarError}
							<div class="absolute inset-0 flex items-center justify-center text-red-600 font-semibold">
								{avatarError}
							</div>
						{/if}
					</div>
					<button class="btn-glossy px-4 py-2 w-full mb-1" onclick={enterArena} disabled={entering}>
						<DoorOpen  strokeWidth="3" class="inline size-4 mb-1"/> {entering ? 'Finding opponent...' : `Enter (${arenaStats?.online ?? 5} online)`}
					</button>
					{#if enterError}
						<p class="text-sm text-red-600 font-semibold text-center">{enterError}</p>
					{/if}
				</div>
				<div class="p-3 border border-gray-200 rounded-lg">
					<p class="text-sm font-bold mb-3">Daily Challenges</p>
				</div>
			</div>
			<div class="col-span-1"></div>
		</div>
	</div>
 </main>

{#if showMatchmakingModal}
<div class="matchmaking-overlay" onclick={closeMatchmakingModal}>
	<div class="matchmaking-card" onclick={(e) => e.stopPropagation()}>
		{#if findingOpponent}
			<div class="flex flex-col items-center gap-4 py-6">
				<div class="size-10 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
				<p class="font-bold text-lg text-gray-900">Finding opponent…</p>
				<p class="text-xs text-gray-500">Searching the arena for a worthy fight</p>
			</div>
		{:else if modalError}
			<div class="flex flex-col items-center gap-3 py-4">
				<div class="text-2xl">⚠️</div>
				<p class="font-bold text-gray-700">{modalError}</p>
				<div class="flex gap-2 pt-2">
					<button onclick={closeMatchmakingModal} class="btn-secondary px-3 py-1 text-sm">Close</button>
				</div>
			</div>
		{:else if foundMatch}
			<div>
				<h2 class="text-xl font-bold text-gray-900 text-center mb-1">Opponent found!</h2>
				{#if foundMatch.is_robot}
					<p class="text-center text-xs text-gray-500 mb-4">A challenger approaches…</p>
				{:else}
					<p class="text-center text-xs text-gray-500 mb-4">{foundMatch.opponent_name} is waiting.</p>
				{/if}

				<div class="grid grid-cols-2 gap-3 mb-4">
					<div class="border border-[#EFE6E2] rounded-lg p-3 text-center">
						<div class="flex justify-center mb-2">
							<canvas bind:this={youAvatarCanvas} class="avatar-thumb-canvas"></canvas>
						</div>
						<p class="text-xs text-gray-500/70 font-bold">You</p>
											<p class="font-bold text-gray-900 mb-1">{foundMatch.player.username || foundMatch.player.name}</p>
						<p class="text-xs text-gray-600">ATK {foundMatch.player.attack} · DEF {foundMatch.player.defense} · HP {foundMatch.player.max_hp}</p>
					</div>
					<div class="border border-[#EFE6E2] rounded-lg p-3 text-center">
						<div class="flex justify-center mb-2">
							<canvas bind:this={robotAvatarCanvas} class="avatar-thumb-canvas"></canvas>
						</div>
						<p class="text-xs text-gray-500/70 font-bold">{foundMatch.is_robot ? 'Robot' : 'Player'}</p>
						<p class="font-bold text-gray-900 mb-1">{foundMatch.opponent.name}</p>
						<p class="text-xs text-gray-600">ATK {foundMatch.opponent.attack} · DEF {foundMatch.opponent.defense} · HP {foundMatch.opponent.max_hp}</p>
					</div>
				</div>

				<div class="flex gap-2">
					<button onclick={closeMatchmakingModal} class="btn-secondary px-4 py-2 text-sm flex-1">Back</button>
					<button onclick={startFight} class="btn-glossy px-4 py-2 text-sm flex-1">FIGHT</button>
				</div>
			</div>
		{/if}
	</div>
</div>
{/if}

<style>
	.avatar-canvas {
		flex: 1;
		min-height: 0;
		display: block;
		width: 100%;
		height: 400px;
		background: transparent;
		touch-action: none;
		cursor: grab;
	}

	.avatar-canvas:active {
		cursor: grabbing;
	}

				.avatar-error {
		padding: 8px 14px;
		font-size: 12px;
		color: #ffb4a1;
	}

	.matchmaking-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}
	.matchmaking-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
		padding: 1.75rem;
		width: 100%;
		max-width: 460px;
	}

	.avatar-thumb-canvas {
		width: 56px;
		height: 56px;
		display: block;
		margin: 0 auto;
		border-radius: 9999px;
		border: 2px solid #fff;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		background: transparent;
		touch-action: none;
	}
</style>