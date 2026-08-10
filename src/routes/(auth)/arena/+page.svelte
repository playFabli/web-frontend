<script lang="ts">
	import {
		Engine,
		ImportMeshAsync,
		Scene,
		TargetCamera,
		Vector3,
		Color3,
		HemisphericLight,
		DirectionalLight,
		ShadowGenerator,
		DefaultRenderingPipeline,
		ImageProcessingConfiguration,
		ColorCurves,
		RenderTargetTexture,

		CubeTexture

	} from "@babylonjs/core";
	import "@babylonjs/loaders/glTF";
	import { onMount } from "svelte";

	let canvas: HTMLCanvasElement = $state();

	// Rough phone/tablet check so we can pick a quality tier. Doesn't need to
	// be bulletproof - it's just choosing between "cheap" and "nice" settings.
	function isMobileDevice(): boolean {
		const ua = navigator.userAgent;
		const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
		return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || coarsePointer;
	}

	onMount(() => {
		const mobile = isMobileDevice();

		const engine = new Engine(canvas, true);
		const scene = new Scene(engine);
		
		// scene.createDefaultEnvironment({
		// 	environmentTexture: "/textures/area_env.env"
		// });

		// Static showcase scene, nothing needs to be pickable - this skips a
		// scene-wide raycast on every pointer move, which matters a lot on
		// touch devices that fire pointermove constantly while scrolling.
		scene.skipPointerMovePicking = true;

		const camera = new TargetCamera("camera", new Vector3(0, 5, -15), scene);
		camera.attachControl(canvas, false);
		camera.position = new Vector3(-16.0539, 3.43908, 15.2442);
		camera.rotation.y = Math.PI;
		camera.setFocalLength(60);
		// The arena's bounding diagonal is ~160 units, so 400 leaves plenty of
		// headroom without wasting depth-buffer precision the way 10000 did.
		camera.maxZ = 400;

		// --- Ambient fill ---
		// Every material in Arena.gltf is metallicFactor 0 with no roughness
		// override (fully rough), so an HDR environment texture buys almost no
		// visible specular reflection - it's mostly just paying for ambient
		// fill. A HemisphericLight gives the same fill for free (no texture
		// download, no cubemap prefiltering), so it's used everywhere, and the
		// heavier IBL environment is only added on non-mobile for the extra sheen.
		const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
		ambient.diffuse = new Color3(0.65, 0.8, 1.0); // blue sky overhead
		ambient.groundColor = new Color3(0.35, 0.32, 0.2); // warm ground bounce off stone/grass
		ambient.intensity = mobile ? 0.65 : 0.2;

		if (!mobile) {
			scene.createDefaultEnvironment({
				createSkybox: true,
				skyboxSize: 100,
				skyboxColor: new Color3(1,1,1),
				skyboxTexture: "/textures/arena_env.env",
				environmentTexture: "/textures/arena_env.env"
			});
			scene.environmentIntensity = 0.5;
		}

		// --- Key light + shadows ---
		const light = new DirectionalLight("dirLight", new Vector3(-1, -2, -0.5), scene);
		light.diffuse = new Color3(1.0, 0.95, 0.82); // warm sunlight rather than neutral white
		light.intensity = 2.0;

		// autoUpdateExtends already defaults to true in Babylon, but
		// autoCalcShadowZBounds defaults to false - and that's the one that
		// actually fits shadowMinZ/shadowMaxZ to the real casters each frame.
		// Left off, the frustum was stuck at the hardcoded 0.1-50 range below,
		// which is too shallow for a scene with a ~160 unit diagonal and was
		// almost certainly the cause of clipped/missing shadows at the edges.
		light.autoUpdateExtends = true;
		light.autoCalcShadowZBounds = true;
		light.shadowMinZ = 0.1; // fallback for the first frame or two, before auto-calc kicks in
		light.shadowMaxZ = 200;

		const shadowMapSize = mobile ? 512 : 1024;
		const shadowGenerator = new ShadowGenerator(shadowMapSize, light);
		shadowGenerator.darkness = 0.3;
		shadowGenerator.bias = 0.004; // start low; raise a little only if you see acne on the stone/ground
		shadowGenerator.normalBias = 0.01;

		if (mobile) {
			// PCSS (contact hardening) does a blocker search plus a wide PCF
			// kernel per shadow texel - too heavy for most phone GPUs. A
			// blurred exponential shadow map gives soft-ish edges in one pass.
			shadowGenerator.useBlurExponentialShadowMap = true;
			shadowGenerator.blurKernel = 16;
		} else {
			shadowGenerator.useContactHardeningShadow = true;
			shadowGenerator.contactHardeningLightSizeUVRatio = 0.05;
			shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
		}

		// --- Post-processing ---
		const pipeline = new DefaultRenderingPipeline("staticScenePipeline", !mobile, scene, [camera]);
		pipeline.fxaaEnabled = true;
		pipeline.imageProcessingEnabled = true;
		pipeline.imageProcessing.toneMappingEnabled = true;
		pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
		pipeline.imageProcessing.contrast = 1.15;
		pipeline.imageProcessing.exposure = 1; // brighter, "washed in sun" feel
		pipeline.imageProcessing.vignetteEnabled = true;
		pipeline.imageProcessing.vignetteWeight = 2.7; // just enough to frame the shot, not moody

		// Punchier, more saturated colors - the generic "game" look, as opposed
		// to a flat/realistic grade. Only touching saturation (not hue/density)
		// keeps this predictable rather than accidentally color-shifting things.
		pipeline.imageProcessing.colorCurvesEnabled = true;
		const curves = new ColorCurves();
		curves.globalSaturation = -20;
		pipeline.imageProcessing.colorCurves = curves;

		// Bloom is most of what reads as "sunny game engine" - it's what makes
		// sunlit edges and bright stone actually glow instead of just being flat
		// white. Cheaper kernel/scale on mobile since it's a blur pass.
		// pipeline.bloomEnabled = true;
		// pipeline.bloomThreshold = 0.7;
		// pipeline.bloomWeight = 0.2;
		// pipeline.bloomKernel = mobile ? 32 : 64;
		// pipeline.bloomScale = mobile ? 0.4 : 0.5;

		if (mobile) {
			// Small extra safety margin for weaker phone GPUs. Bump this down
			// toward 1.0, or remove it, if your target devices handle native
			// resolution fine.
			engine.setHardwareScalingLevel(1.15);
		}

		// --- Load the model ---
		ImportMeshAsync("/models/Arena.gltf", scene)
			.then((result) => {
				result.meshes.forEach((mesh) => {
					if (mesh.geometry) {
						mesh.receiveShadows = true;
						shadowGenerator.getShadowMap()?.renderList?.push(mesh);
					}
					mesh.isPickable = false;
					mesh.doNotSyncBoundingInfo = true;
					mesh.freezeWorldMatrix();
				});

				// Bake shadows once and stop recalculating - nothing in this
				// scene moves, so there's no reason to redo this every frame.
				setTimeout(() => {
					light.autoUpdateExtends = false;
					light.autoCalcShadowZBounds = false;
					const shadowMap = shadowGenerator.getShadowMap();
					if (shadowMap) {
						shadowMap.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
					}
				}, 2000);
			})
			.catch((err) => {
				console.error("Failed to load Arena.gltf:", err);
			});

		engine.runRenderLoop(() => {
			scene.render();
		});

		const handleResize = () => engine.resize();
		window.addEventListener("resize", handleResize);

		scene.executeWhenReady(() => {
			scene.materials.forEach((material) => material.freeze());
		});

		// Clean up if this component ever unmounts (SPA navigation, etc.) -
		// otherwise the WebGL context and listeners leak.
		return () => {
			window.removeEventListener("resize", handleResize);
			scene.dispose();
			engine.dispose();
		};
	});
</script>

<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
		height: 100%;
		touch-action: none;
	}
</style>