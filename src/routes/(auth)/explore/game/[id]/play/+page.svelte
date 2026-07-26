<script>
	import { onMount, onDestroy } from 'svelte';
	import * as BABYLON from 'babylonjs'

	let canvas;
	let engine;
	let scene;

	const inputMap = {};

	onMount(() => {
		engine = new BABYLON.Engine(canvas, true);
		scene = new BABYLON.Scene(engine);

		const camera = new BABYLON.ArcRotateCamera(
			'camera',
			-Math.PI / 2,
			Math.PI / 2.5,
			10,
			new BABYLON.Vector3(0, 0, 0),
			scene
		);
		camera.attachControl(canvas, true);

		const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);

		const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, scene);

		const cube = BABYLON.MeshBuilder.CreateBox('playerCube', { size: 1 }, scene);
		cube.position.y = 0.5;

		const cubeMaterial = new BABYLON.StandardMaterial('cubeMat', scene);
		cubeMaterial.diffuseColor = new BABYLON.Color3(0, 0.6, 1); // Голубой цвет
		cube.material = cubeMaterial;

		const onKeyDown = (evt) => {
			inputMap[evt.key.toLowerCase()] = evt.type === 'keydown';
		};
		const onKeyUp = (evt) => {
			inputMap[evt.key.toLowerCase()] = evt.type === 'keydown';
		};

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);

		const speed = 0.1;

		scene.onBeforeRenderObservable.add(() => {
			if (inputMap['w'] || inputMap['arrowup']) {
				cube.position.z += speed;
			}
			if (inputMap['s'] || inputMap['arrowdown']) {
				cube.position.z -= speed;
			}
			// Движение влево/вправо (ось X)
			if (inputMap['a'] || inputMap['arrowleft']) {
				cube.position.x -= speed;
			}
			if (inputMap['d'] || inputMap['arrowright']) {
				cube.position.x += speed;
			}
		});

		engine.runRenderLoop(() => {
			scene.render();
		});

		const resizeHandler = () => engine.resize();
		window.addEventListener('resize', resizeHandler);

		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('resize', resizeHandler);
		};
	});

	onDestroy(() => {
		if (scene) scene.dispose();
		if (engine) engine.dispose();
	});
</script>

<canvas bind:this="{canvas}" class="game-canvas"></canvas>

<style>
	.game-canvas {
		width: 100%;
		height: 100%;
		display: block;
		touch-action: none;
		outline: none;
	}
</style>
