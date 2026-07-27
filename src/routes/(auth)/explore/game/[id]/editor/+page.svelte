<script lang="ts">
	import * as BABYLON from 'babylonjs';
	import { onMount } from "svelte";

	let canvas: HTMLCanvasElement;

	let engine: BABYLON.Engine;
	let scene: BABYLON.Scene;
	let camera: BABYLON.UniversalCamera;
	let gizmoManager: BABYLON.GizmoManager;

	// Flips to true once the scene/camera/light exist, so the $effect below
	// knows it's safe to start creating meshes.
	let ready = $state(false);

	// Babylon meshes aren't Svelte state, so we keep our own id -> mesh map
	// instead of trying to make Babylon objects reactive.
	const meshMap = new Map<string, BABYLON.Mesh>();

	// Purely Babylon-side bookkeeping (which meshes currently show an
	// outline), so these stay plain variables rather than $state.
	let hoveredMesh: BABYLON.Mesh | null = null;
	let selectedMesh: BABYLON.Mesh | null = null;

	const HOVER_OUTLINE = { color: BABYLON.Color3.Red(), width: 0.03 };
	const SELECT_OUTLINE = { color: new BABYLON.Color3(0.2, 0.6, 1), width: 0.03 };

	let mode: "move" | "rotate" | "scale" = $state("move");

	interface Vector3 {
		x: number;
		y: number;
		z: number;
	}

	interface Part {
		id: string;
		name: string;
		color: string;
		position: Vector3;
		rotation: Vector3;
		scale: Vector3;
		script: string;
	}

	let parts: Part[] = $state([
		{
			id: crypto.randomUUID(),
			name: "Baseplate",
			color: "#7f7f7f",
			position: { x: 0, y: -0.5, z: 0 },
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 20, y: 1, z: 20 },
			script: ""
		}
	]);

	// selectedId needs to be assignable (createPart / the explorer list both
	// write to it), so it's plain state rather than a $derived value.
	let selectedId: string = $state(parts[0].id);

	let selected = $derived(parts.find((p) => p.id === selectedId));

	function createPart() {
		const part: Part = {
			id: crypto.randomUUID(),
			name: `Part${parts.length}`,
			color: "#3b82f6",
			position: { x: 0, y: 5, z: 0 },
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 4, y: 1, z: 2 },
			script: 'print("Hello!")'
		};

		parts = [...parts, part];
		selectedId = part.id;
	}

	function savePlace() {
		localStorage.setItem("place", JSON.stringify(parts));
		alert("Saved!");
	}

	function loadPlace() {
		const json = localStorage.getItem("place");
		if (!json) return;

		parts = JSON.parse(json);
		selectedId = parts[0]?.id;
	}

	function publishPlace() {
		console.log(JSON.stringify(parts));
		// later:
		// await fetch("/api/publish", { ... })
	}

	// --- Babylon <-> parts sync ---

	// RotationGizmo switches the mesh over to rotationQuaternion the moment
	// you drag it, at which point mesh.rotation stops being kept in sync.
	// Read from whichever representation is actually active.
	function meshRotationDegrees(mesh: BABYLON.Mesh): Vector3 {
		if (mesh.rotationQuaternion) {
			const e = mesh.rotationQuaternion.toEulerAngles();
			return {
				x: BABYLON.Tools.ToDegrees(e.x),
				y: BABYLON.Tools.ToDegrees(e.y),
				z: BABYLON.Tools.ToDegrees(e.z)
			};
		}

		return {
			x: BABYLON.Tools.ToDegrees(mesh.rotation.x),
			y: BABYLON.Tools.ToDegrees(mesh.rotation.y),
			z: BABYLON.Tools.ToDegrees(mesh.rotation.z)
		};
	}

	// Mirrors applying rotation the other way: if the mesh has already been
	// switched to quaternion mode by the gizmo, writing to .rotation directly
	// would be silently ignored, so update the quaternion instead.
	function applyRotationToMesh(mesh: BABYLON.Mesh, rotation: Vector3) {
		const x = BABYLON.Tools.ToRadians(rotation.x);
		const y = BABYLON.Tools.ToRadians(rotation.y);
		const z = BABYLON.Tools.ToRadians(rotation.z);

		if (mesh.rotationQuaternion) {
			mesh.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(y, x, z);
		} else {
			mesh.rotation.set(x, y, z);
		}
	}

	function getOrCreateMesh(part: Part): BABYLON.Mesh {
		let mesh = meshMap.get(part.id);

		if (!mesh) {
			// Unit cube — actual dimensions are applied via mesh.scaling below,
			// so resizing a part never requires rebuilding geometry.
			mesh = BABYLON.MeshBuilder.CreateBox(part.id, { size: 1 }, scene);
			mesh.material = new BABYLON.StandardMaterial(`${part.id}-mat`, scene);
			mesh.metadata = { partId: part.id };
			meshMap.set(part.id, mesh);
		}

		return mesh;
	}

	function syncParts(currentParts: Part[]) {
		if (!scene) return;

		const currentIds = new Set(currentParts.map((p) => p.id));

		// Drop meshes whose part was removed from the array
		for (const [id, mesh] of meshMap) {
			if (!currentIds.has(id)) {
				if (hoveredMesh === mesh) hoveredMesh = null;
				mesh.material?.dispose();
				mesh.dispose();
				meshMap.delete(id);
			}
		}

		// Create/update a mesh for every part currently in the array
		for (const part of currentParts) {
			const mesh = getOrCreateMesh(part);

			mesh.name = part.name;

			mesh.position.set(part.position.x, part.position.y, part.position.z);

			// Rotation fields are treated as degrees (matches the plain
			// number inputs in the properties panel); Babylon wants radians.
			mesh.rotation.set(
				BABYLON.Tools.ToRadians(part.rotation.x),
				BABYLON.Tools.ToRadians(part.rotation.y),
				BABYLON.Tools.ToRadians(part.rotation.z)
			);

			mesh.scaling.set(part.scale.x, part.scale.y, part.scale.z);

			const mat = mesh.material as BABYLON.StandardMaterial;
			mat.diffuseColor = BABYLON.Color3.FromHexString(part.color);
		}
	}

	// Re-runs whenever `parts`, `selectedId`, or `mode` changes, and once
	// `ready` flips true after the scene is created in onMount. Keeping this
	// as one effect guarantees syncParts (which creates/updates meshes) always
	// runs before updateSelection (which looks meshes up), regardless of
	// which piece of state triggered the run.
	$effect(() => {
		if (!ready) return;

		syncParts(parts);
		updateSelection(selectedId);

		gizmoManager.positionGizmoEnabled = mode === "move";
		gizmoManager.rotationGizmoEnabled = mode === "rotate";
		gizmoManager.scaleGizmoEnabled = mode === "scale";

		wireCameraDetachForActiveGizmo();
	});

	// --- Hover + selection outlines ---

	function applyOutline(mesh: BABYLON.Mesh, outline: { color: BABYLON.Color3; width: number }) {
		mesh.renderOutline = true;
		mesh.outlineColor = outline.color;
		mesh.outlineWidth = outline.width;
	}

	function clearOutline(mesh: BABYLON.Mesh) {
		mesh.renderOutline = false;
	}

	// Hover uses red; the selected mesh keeps its own persistent outline
	// instead, so hovering over it shouldn't override that color.
	function setHover(mesh: BABYLON.Mesh | null) {
		if (hoveredMesh === mesh) return;

		if (hoveredMesh && hoveredMesh !== selectedMesh) {
			clearOutline(hoveredMesh);
		}

		hoveredMesh = mesh;

		if (mesh && mesh !== selectedMesh) {
			applyOutline(mesh, HOVER_OUTLINE);
		}
	}

	function updateSelection(id: string) {
		const previous = selectedMesh;
		const next = meshMap.get(id) ?? null;

		if (previous) clearOutline(previous);
		selectedMesh = next;
		if (next) applyOutline(next, SELECT_OUTLINE);

		// If the mouse is still over the mesh we just deselected, let it fall
		// back to showing the hover color instead of no outline at all.
		if (previous && previous === hoveredMesh) {
			applyOutline(previous, HOVER_OUTLINE);
		}

		gizmoManager?.attachToMesh(next);
	}

	function partIdOf(mesh: BABYLON.AbstractMesh | null | undefined): string | undefined {
		return (mesh?.metadata as { partId?: string } | undefined)?.partId;
	}

	// While the gizmo is being dragged, Babylon mutates selectedMesh's
	// transform directly; mirror it back into `parts` every frame so the
	// Properties panel stays live during the drag.
	function syncSelectedMeshBackToPart() {
		if (!selectedMesh) return;

		const part = parts.find((p) => p.id === selectedId);
		if (!part) return;

		const eps = 1e-6;

		if (Math.abs(part.position.x - selectedMesh.position.x) > eps) part.position.x = selectedMesh.position.x;
		if (Math.abs(part.position.y - selectedMesh.position.y) > eps) part.position.y = selectedMesh.position.y;
		if (Math.abs(part.position.z - selectedMesh.position.z) > eps) part.position.z = selectedMesh.position.z;

		const rx = BABYLON.Tools.ToDegrees(selectedMesh.rotation.x);
		const ry = BABYLON.Tools.ToDegrees(selectedMesh.rotation.y);
		const rz = BABYLON.Tools.ToDegrees(selectedMesh.rotation.z);
		if (Math.abs(part.rotation.x - rx) > eps) part.rotation.x = rx;
		if (Math.abs(part.rotation.y - ry) > eps) part.rotation.y = ry;
		if (Math.abs(part.rotation.z - rz) > eps) part.rotation.z = rz;

		if (Math.abs(part.scale.x - selectedMesh.scaling.x) > eps) part.scale.x = selectedMesh.scaling.x;
		if (Math.abs(part.scale.y - selectedMesh.scaling.y) > eps) part.scale.y = selectedMesh.scaling.y;
		if (Math.abs(part.scale.z - selectedMesh.scaling.z) > eps) part.scale.z = selectedMesh.scaling.z;
	}

	// Gizmo instances get recreated each time their *GizmoEnabled flag is
	// toggled on, so we re-wire this after every mode switch rather than once.
	function wireCameraDetachForActiveGizmo() {
		const activeGizmo =
			gizmoManager.gizmos.positionGizmo ??
			gizmoManager.gizmos.rotationGizmo ??
			gizmoManager.gizmos.scaleGizmo;

		activeGizmo?.onDragStartObservable.add(() => camera.detachControl());
		activeGizmo?.onDragEndObservable.add(() => camera.attachControl(canvas, true));
	}

	onMount(() => {
		engine = new BABYLON.Engine(canvas, true);

		scene = new BABYLON.Scene(engine);

		// Camera
		camera = new BABYLON.UniversalCamera(
			"camera",
			new BABYLON.Vector3(0, 15, -20),
			scene
		);

		camera.attachControl(canvas, true);

		camera.speed = 1.0;
		camera.inertia = 0;

		camera.keysUp = [87];    // W
		camera.keysDown = [83];  // S
		camera.keysLeft = [65];  // A
		camera.keysRight = [68]; // D

		window.addEventListener("keydown", (e) => {
			if (e.key === "Shift") {
				camera.speed = 2.5;
			}
		});

		window.addEventListener("keyup", (e) => {
			if (e.key === "Shift") {
				camera.speed = 1.0;
			}
		});

		// Light
		new BABYLON.HemisphericLight(
			"light",
			new BABYLON.Vector3(0, 1, 0),
			scene
		);

		// Gizmos — we drive attachment ourselves from `selectedId` (see
		// updateSelection), so Babylon shouldn't auto-attach on arbitrary clicks.
		gizmoManager = new BABYLON.GizmoManager(scene);
		gizmoManager.usePointerToAttachGizmos = false;

		// Hover outline + click-to-select. We call scene.pick() ourselves on
		// every move rather than relying on pointerInfo.pickInfo, since Babylon
		// doesn't always keep that populated on move for performance reasons.
		scene.onPointerObservable.add((pointerInfo) => {
			if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
				const pickedMesh = scene.pick(scene.pointerX, scene.pointerY).pickedMesh;
				const partId = partIdOf(pickedMesh);

				setHover(partId ? (pickedMesh as BABYLON.Mesh) : null);
			} else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERTAP) {
				// POINTERTAP (rather than POINTERPICK/POINTERDOWN) so that
				// dragging to look around with the camera doesn't also select.
				const partId = partIdOf(pointerInfo.pickInfo?.pickedMesh);

				if (partId) {
					selectedId = partId;
				}
			}
		});

		// Mirrors the selected mesh's live transform (as the gizmo drags it)
		// back into `parts`, so the Properties panel updates in real time.
		scene.onBeforeRenderObservable.add(syncSelectedMeshBackToPart);

		const onPointerLeave = () => setHover(null);
		canvas.addEventListener("pointerleave", onPointerLeave);

		// The baseplate and every other part are now rendered from `parts`
		// itself (see syncParts), so there's no separate hardcoded ground mesh.
		ready = true;

		engine.runRenderLoop(() => {
			scene.render();
		});

		window.addEventListener("resize", () => {
			engine.resize();
		});

		return () => {
			canvas.removeEventListener("pointerleave", onPointerLeave);
			engine.dispose();
		};
	});
</script>
<style>
	.btn-secondary {
		background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
		border: 1px solid #9ca3af;
		border-radius: 4px;
		color: #374151;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		text-decoration: none;
		display: inline-block;
	}
	.btn-secondary:hover {
		background: linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%);
		border-color: #6b7280;
		color: #1f2937;
	}
</style>
<div class="flex-1 flex flex-col min-h-0">
	<!-- Toolbar -->
	<div class="bg-gray-50 border-b border-gray-200 px-3 py-1.5 flex flex-wrap items-center gap-2 flex-shrink-0">
		<button onclick={createPart} class="btn-secondary px-2 py-1 text-sm">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-4 inline mb-1"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
			Create Part</button>
		<div class="h-4 border-l border-gray-300"></div>
		<button onclick={() => mode = 'move'} class="btn-secondary px-2 py-1 text-sm" class:bg-blue-100={mode === 'move'}>
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-4 inline mb-1"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
			Move</button>
		<button onclick={() => mode = 'rotate'} class="btn-secondary px-2 py-1 text-sm" class:bg-blue-100={mode === 'rotate'}>
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-4 inline mb-1"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>
			Rotate</button>
		<button onclick={() => mode = 'scale'} class="btn-secondary px-2 py-1 text-sm" class:bg-blue-100={mode === 'scale'}>
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-4 inline mb-1"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
			Scale</button>
		<div class="h-4 border-l border-gray-300"></div>
		<button onclick={savePlace} class="btn-secondary px-2 py-1 text-sm">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-4 inline mb-1"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>
			Save</button>
		<button onclick={loadPlace} class="btn-secondary px-2 py-1 text-sm">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-4 inline mb-1"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
			Load</button>
		<button onclick={publishPlace} class="btn-glossy px-2 py-1 text-sm">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-4 inline mb-1"><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"/><path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"/></svg>
			Publish</button>
	</div>

	<!-- Main Editor Body -->
	<div class="flex-1 flex min-h-0">
		<!-- Left Explorer -->
		<div class="w-52 border-r border-gray-200 bg-white flex-shrink-0 overflow-y-auto">
			<div class="p-3">
				<h2 class="text-sm font-semibold text-accent mb-2">Explorer</h2>
				<div class="space-y-1 text-sm">
					<div class="hover:bg-gray-50 px-2 py-1 rounded cursor-default">📦 Workspace</div>
					{#each parts as part}
							<div
								class="ml-4 px-2 py-1 rounded cursor-pointer"
								class:bg-blue-100={selectedId === part.id}
								onclick={() => selectedId = part.id}
							>
								🟦 {part.name}
							</div>
						{/each}				
					</div>
			</div>
		</div>

		<!-- Center Viewport -->
		<div class="flex-1 bg-gray-50 border-r border-gray-200 flex items-center justify-center p-2 min-h-0">
			<div class="text-center">
				<canvas
					bind:this={canvas}
					class="w-[800px] h-[600px] block"
				></canvas>
				<p class="text-xs text-gray-500 mt-2">Click "Create Part" to start building</p>
			</div>
		</div>

		<!-- Right Properties -->
		<div class="w-56 border-l border-gray-200 bg-white flex-shrink-0 overflow-y-auto">
			{#if selected}
			<div class="p-3">
				<h2 class="text-sm font-semibold text-accent mb-2">Properties</h2>
				<div class="space-y-2 text-sm">
					<div>
						<label class="form-label">Name</label>
						<input bind:value={selected.name} type="text" class="form-input">
					</div>
					<div>
						<label class="form-label">Color</label>
						<input bind:value={selected.color} type="color" class="form-input h-8 p-0.5">
					</div>
					<div class="grid grid-cols-3 gap-1">
						<div><label class="form-label">Pos X</label><input bind:value={selected.position.x} type="number" class="form-input"></div>
						<div><label class="form-label">Pos Y</label><input bind:value={selected.position.y} type="number" class="form-input"></div>
						<div><label class="form-label">Pos Z</label><input bind:value={selected.position.z} type="number" class="form-input"></div>
						<div><label class="form-label">Rot X</label><input bind:value={selected.rotation.x} type="number" class="form-input"></div>
						<div><label class="form-label">Rot Y</label><input bind:value={selected.rotation.y} type="number" class="form-input"></div>
						<div><label class="form-label">Rot Z</label><input bind:value={selected.rotation.z} type="number" class="form-input"></div>
						<div><label class="form-label">Size X</label><input bind:value={selected.scale.x} type="number" class="form-input"></div>
						<div><label class="form-label">Size Y</label><input bind:value={selected.scale.y} type="number" class="form-input"></div>
						<div><label class="form-label">Size Z</label><input bind:value={selected.scale.z} type="number" class="form-input"></div>
					</div>
				</div>
			</div>
			{/if}
		</div>
	</div>

	<!-- Script Editor (Bottom) -->
	<div class="border-t border-gray-200 bg-white flex-shrink-0" style="height: 120px;">
		<div class="p-2 h-full flex flex-col">
			<h2 class="text-sm font-semibold text-accent mb-1">Script Editor</h2>
			<textarea class="form-input font-mono text-xs flex-1 resize-none" readonly style="font-family: monospace;">print("Hello, world!")
wait(1)
part.BrickColor = "Bright red"</textarea>
		</div>
	</div>
</div>