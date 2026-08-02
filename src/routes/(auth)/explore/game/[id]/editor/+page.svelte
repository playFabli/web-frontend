<script lang="ts">
	import { Color3 } from '@babylonjs/core';
	import * as BABYLON from 'babylonjs';
	import { onMount } from "svelte";
 
	let canvas: HTMLCanvasElement;
 
	let engine: BABYLON.Engine;
	let scene: BABYLON.Scene;
	let camera: BABYLON.UniversalCamera;
	let gizmoManager: BABYLON.GizmoManager;
	let handleLayer: BABYLON.UtilityLayerRenderer;
 
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
 
	const HOVER_OUTLINE = { color: Color3.Red(), width: 0.03 };
	const SELECT_OUTLINE = { color: new Color3(0.2, 0.6, 1), width: 0.03 };
 
	let mode: "move" | "rotate" | "scale" = $state("move");
 
	let snapEnabled: boolean = $state(false);
	let snapSize: number = $state(1);
 
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
 
	// --- Undo / redo ---
 
	let historyStack: Part[][] = [structuredClone($state.snapshot(parts))];
	let historyPointer = $state(0);
	let historyTimer: ReturnType<typeof setTimeout> | undefined;
 
	let canUndo = $derived(historyPointer > 0);
	let canRedo = $derived(historyPointer < historyStack.length - 1);
 
	function commitHistory() {
		historyStack = historyStack.slice(0, historyPointer + 1);
		historyStack.push(structuredClone($state.snapshot(parts)));
		historyPointer = historyStack.length - 1;
	}
 
	// Debounced so a gizmo drag (many changes per frame) or typing in a field
	// records one undo step shortly after things settle, not one per change.
	function scheduleHistoryCommit() {
		clearTimeout(historyTimer);
		historyTimer = setTimeout(() => {
			if (JSON.stringify(parts) === JSON.stringify(historyStack[historyPointer])) return;
			commitHistory();
		}, 400);
	}
 
	function restoreHistory(index: number) {
		clearTimeout(historyTimer);
		historyPointer = index;
		parts = structuredClone(historyStack[index]);
		if (!parts.some((p) => p.id === selectedId)) selectedId = parts[0]?.id;
	}
 
	function undo() {
		if (canUndo) restoreHistory(historyPointer - 1);
	}
 
	function redo() {
		if (canRedo) restoreHistory(historyPointer + 1);
	}
 
	// A bare `parts` read only tracks array reassignment (create/load), not
	// mutations to nested properties like position.x — Svelte's reactivity is
	// per-property, so we have to actually read every leaf to track edits to
	// them too (this is what makes move/rotate/scale/color/name undoable).
	function touchParts(list: Part[]) {
		for (const p of list) {
			p.name;
			p.color;
			p.script;
			p.position.x;
			p.position.y;
			p.position.z;
			p.rotation.x;
			p.rotation.y;
			p.rotation.z;
			p.scale.x;
			p.scale.y;
			p.scale.z;
		}
	}
 
	// Any change to `parts` (from the gizmo, the properties panel, create,
	// load, ...) schedules a debounced history commit.
	$effect(() => {
		touchParts(parts);
		scheduleHistoryCommit();
	});
 
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
 
	// --- Copy / paste / delete ---
 
	let clipboard: Part | null = null;
 
	function copySelected() {
		if (!selected) return;
		clipboard = structuredClone($state.snapshot(selected));
	}
 
	function pasteClipboard() {
		if (!clipboard) return;
 
		// Fresh deep clone per paste so multiple pasted parts don't end up
		// sharing the same position/rotation/scale object.
		const cloned = structuredClone(clipboard);
		const part: Part = {
			...cloned,
			id: crypto.randomUUID(),
			name: `${cloned.name} Copy`,
			position: { x: cloned.position.x + 2, y: cloned.position.y, z: cloned.position.z }
		};
 
		parts = [...parts, part];
		selectedId = part.id;
	}
 
	function deleteSelected() {
		if (!selected) return;
 
		const remaining = parts.filter((p) => p.id !== selectedId);
		parts = remaining;
		selectedId = remaining[0]?.id;
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
			applyRotationToMesh(mesh, part.rotation);
 
			mesh.scaling.set(part.scale.x, part.scale.y, part.scale.z);
 
			const mat = mesh.material as BABYLON.StandardMaterial;
			mat.diffuseColor = Color3.FromHexString(part.color);
		}
	}
 
	// Re-runs whenever `parts`, `selectedId`, `mode`, or the snap settings
	// change, and once `ready` flips true after the scene is created in
	// onMount. Keeping this as one effect guarantees syncParts (which
	// creates/updates meshes) always runs before updateSelection (which
	// looks meshes up), regardless of which piece of state triggered the run.
	$effect(() => {
		if (!ready) return;
 
		syncParts(parts);
		updateSelection(selectedId);
 
		gizmoManager.positionGizmoEnabled = mode === "move";
		gizmoManager.rotationGizmoEnabled = mode === "rotate";
		// Scale mode uses the custom face handles below (see updateFaceHandles)
		// instead of Babylon's center-anchored ScaleGizmo, to match Roblox's
		// one-sided, per-face resize behavior.
		gizmoManager.scaleGizmoEnabled = false;
 
		if (gizmoManager.gizmos.positionGizmo) {
			gizmoManager.gizmos.positionGizmo.snapDistance = snapEnabled ? snapSize : 0;
		}
 
		if (gizmoManager.gizmos.rotationGizmo) {
			// Parts are unit cubes with non-uniform scaling, and Babylon can't
			// cleanly derive a rotation-only gizmo orientation from a world
			// matrix that also contains non-uniform scale. This keeps the
			// gizmo at a fixed orientation instead of trying to (and failing
			// to) match the mesh's own rotated+scaled orientation.
			gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
		}
 
		wireCameraDetachForActiveGizmo();
	});
 
	// --- Hover + selection outlines ---
 
	function applyOutline(mesh: BABYLON.Mesh, outline: { color: Color3; width: number }) {
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
 
		const rot = meshRotationDegrees(selectedMesh);
		if (Math.abs(part.rotation.x - rot.x) > eps) part.rotation.x = rot.x;
		if (Math.abs(part.rotation.y - rot.y) > eps) part.rotation.y = rot.y;
		if (Math.abs(part.rotation.z - rot.z) > eps) part.rotation.z = rot.z;
 
		if (Math.abs(part.scale.x - selectedMesh.scaling.x) > eps) part.scale.x = selectedMesh.scaling.x;
		if (Math.abs(part.scale.y - selectedMesh.scaling.y) > eps) part.scale.y = selectedMesh.scaling.y;
		if (Math.abs(part.scale.z - selectedMesh.scaling.z) > eps) part.scale.z = selectedMesh.scaling.z;
	}
 
	// Gizmo instances get recreated each time their *GizmoEnabled flag is
	// toggled on, so track which one we've already wired to avoid stacking
	// up duplicate listeners every time the effect reruns.
	let wiredGizmo: BABYLON.Gizmo | null = null;
 
	function wireCameraDetachForActiveGizmo() {
		const activeGizmo =
			gizmoManager.gizmos.positionGizmo ??
			gizmoManager.gizmos.rotationGizmo ??
			gizmoManager.gizmos.scaleGizmo;
 
		if (!activeGizmo || activeGizmo === wiredGizmo) return;
 
		wiredGizmo = activeGizmo;
		activeGizmo.onDragStartObservable.add(() => camera.detachControl());
		activeGizmo.onDragEndObservable.add(() => camera.attachControl(canvas, true));
	}
 
	// --- Custom per-face scale handles (Roblox-style resize) ---
	// Babylon's built-in ScaleGizmo scales from the mesh's center along 3
	// axis arrows. Roblox instead shows one handle per face, and dragging a
	// handle grows the part outward from that face while the OPPOSITE face
	// stays fixed in place — which requires shifting the mesh's position by
	// half of every size change, not just the scale.
	interface FaceHandleDef {
		axis: "x" | "y" | "z";
		sign: 1 | -1;
		color: Color3;
	}
 
	const FACE_HANDLE_DEFS: FaceHandleDef[] = [
		{ axis: "x", sign: 1, color: new Color3(1, 0.3, 0.3) },
		{ axis: "x", sign: -1, color: new Color3(1, 0.3, 0.3) },
		{ axis: "y", sign: 1, color: new Color3(0.3, 1, 0.3) },
		{ axis: "y", sign: -1, color: new Color3(0.3, 1, 0.3) },
		{ axis: "z", sign: 1, color: new Color3(0.3, 0.3, 1) },
		{ axis: "z", sign: -1, color: new Color3(0.3, 0.3, 1) }
	];
 
	let faceHandles: { mesh: BABYLON.Mesh; def: FaceHandleDef; drag: BABYLON.PointerDragBehavior }[] = [];
 
	function localNormalOf(def: FaceHandleDef): BABYLON.Vector3 {
		return new BABYLON.Vector3(
			def.axis === "x" ? def.sign : 0,
			def.axis === "y" ? def.sign : 0,
			def.axis === "z" ? def.sign : 0
		);
	}
 
	function createFaceHandles() {
		const handleScene = handleLayer.utilityLayerScene;
 
		for (const def of FACE_HANDLE_DEFS) {
			const mesh = BABYLON.MeshBuilder.CreateBox(`faceHandle-${def.axis}${def.sign}`, { size: 0.25 }, handleScene);
			const mat = new BABYLON.StandardMaterial(`faceHandleMat-${def.axis}${def.sign}`, handleScene);
			mat.diffuseColor = def.color;
			mat.emissiveColor = def.color.scale(0.6);
			mesh.material = mat;
			mesh.setEnabled(false);
 
			const drag = new BABYLON.PointerDragBehavior({ dragAxis: localNormalOf(def) });
			// We reposition the handle ourselves every frame based on the
			// mesh's current size, so let the behavior only report drag
			// deltas rather than moving the handle on its own.
			drag.moveAttached = false;
			mesh.addBehavior(drag);
 
			drag.onDragStartObservable.add(() => camera.detachControl());
			drag.onDragEndObservable.add(() => camera.attachControl(canvas, true));
 
			drag.onDragObservable.add((event) => {
				if (!selectedMesh) return;
 
				const worldNormal = BABYLON.Vector3.TransformNormal(localNormalOf(def), selectedMesh.getWorldMatrix()).normalize();
				const growth = BABYLON.Vector3.Dot(event.delta, worldNormal);
 
				selectedMesh.scaling[def.axis] = Math.max(0.05, selectedMesh.scaling[def.axis] + growth);
				selectedMesh.position.addInPlace(worldNormal.scale(growth / 2));
			});
 
			faceHandles.push({ mesh, def, drag });
		}
	}
 
	function updateFaceHandles() {
		const show = mode === "scale" && !!selectedMesh;
 
		for (const { mesh, def } of faceHandles) {
			if (!show) {
				if (mesh.isEnabled()) mesh.setEnabled(false);
				continue;
			}
 
			if (!mesh.isEnabled()) mesh.setEnabled(true);
 
			const worldMatrix = selectedMesh!.getWorldMatrix();
			const localOffset = localNormalOf(def).scale(0.5);
 
			mesh.position.copyFrom(BABYLON.Vector3.TransformCoordinates(localOffset, worldMatrix));
 
			// Keep handles a roughly constant on-screen size regardless of the
			// mesh's own (possibly extreme) non-uniform scale or camera distance.
			const size = BABYLON.Vector3.Distance(camera.position, mesh.position) * 0.03;
			mesh.scaling.set(size, size, size);
		}
	}
 
	onMount(() => {
		// Right-click context menu and page scrolling are disabled site-wide
		// while the editor is mounted; individual panels (Explorer, Properties,
		// Script Editor) keep their own overflow-y-auto scrolling.
		const onContextMenu = (e: Event) => e.preventDefault();
		window.addEventListener("contextmenu", onContextMenu);
 
		const previousBodyOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
 
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
 
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "Shift") {
				camera.speed = 2.5;
			}
 
			// Don't hijack keys while the user is typing in a form field.
			const target = e.target as HTMLElement | null;
			const isEditable =
				!!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
			if (isEditable) return;
 
			const ctrlOrCmd = e.ctrlKey || e.metaKey;
			const key = e.key.toLowerCase();
 
			if (ctrlOrCmd && key === "z" && !e.shiftKey) {
				e.preventDefault();
				undo();
			} else if (ctrlOrCmd && (key === "y" || (key === "z" && e.shiftKey))) {
				e.preventDefault();
				redo();
			} else if (ctrlOrCmd && key === "c") {
				e.preventDefault();
				copySelected();
			} else if (ctrlOrCmd && key === "v") {
				e.preventDefault();
				pasteClipboard();
			} else if (!ctrlOrCmd && key === "delete") {
				e.preventDefault();
				deleteSelected();
			} else if (!ctrlOrCmd && key === "1") {
				mode = "move";
			} else if (!ctrlOrCmd && key === "2") {
				mode = "rotate";
			} else if (!ctrlOrCmd && key === "3") {
				mode = "scale";
			}
		}
 
		function onKeyUp(e: KeyboardEvent) {
			if (e.key === "Shift") {
				camera.speed = 1.0;
			}
		}
 
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
 
		// Light
		new BABYLON.HemisphericLight(
			"light",
			new BABYLON.Vector3(0, 1, 0),
			scene
		);
 
		// Skybox — a big inverted box with a flat emissive color, no textures
		// needed. infiniteDistance keeps it centered on the camera so it never
		// appears to move as you fly around.
		const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000 }, scene);
		const skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMat", scene);
		skyboxMaterial.backFaceCulling = false;
		skyboxMaterial.disableLighting = true;
		skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
		skyboxMaterial.specularColor = new Color3(0, 0, 0);
		skyboxMaterial.emissiveColor = new Color3(0.53, 0.81, 0.92);
		skybox.material = skyboxMaterial;
		skybox.infiniteDistance = true;
		skybox.isPickable = false;
 
		// Gizmos — we drive attachment ourselves from `selectedId` (see
		// updateSelection), so Babylon shouldn't auto-attach on arbitrary clicks.
		gizmoManager = new BABYLON.GizmoManager(scene);
		gizmoManager.usePointerToAttachGizmos = false;
 
		// Face handles live in their own utility layer scene (same trick
		// Babylon's built-in gizmos use) so they always win picking priority
		// over the actual part meshes, even the far side of a box facing away
		// from the camera.
		handleLayer = new BABYLON.UtilityLayerRenderer(scene);
		createFaceHandles();
 
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
		scene.onBeforeRenderObservable.add(updateFaceHandles);
 
		const onPointerLeave = () => setHover(null);
		canvas.addEventListener("pointerleave", onPointerLeave);
 
		// Scroll to zoom (dolly the camera forward/backward), and also stops
		// the page itself from scrolling while the wheel is over the viewport.
		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
 
			const zoomSpeed = 0.05;
			const forward = camera.getDirection(BABYLON.Vector3.Forward());
			camera.position.addInPlace(forward.scale(-e.deltaY * zoomSpeed));
		};
		canvas.addEventListener("wheel", onWheel, { passive: false });
 
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
			canvas.removeEventListener("wheel", onWheel);
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			window.removeEventListener("contextmenu", onContextMenu);
			document.body.style.overflow = previousBodyOverflow;
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
<div class="h-[91vh] flex flex-col min-h-0">
	<!-- Toolbar -->
	<div class="bg-gray-50 border-b border-[#EFE6E2] px-3 py-1 flex flex-wrap items-center gap-2 flex-shrink-0">
		<button onclick={createPart} class="btn-secondary px-2 py-1 text-sm">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-4 inline mb-1"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
			Create Part</button>
		<div class="h-4 border-l border-gray-300"></div>
		<button onclick={undo} disabled={!canUndo} class="btn-secondary px-2 py-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-4 inline mb-1"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>
			Undo</button>
		<button onclick={redo} disabled={!canRedo} class="btn-secondary px-2 py-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-4 inline mb-1"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>
			Redo</button>
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
		<div class="flex items-center gap-2 flex-shrink-0">
			<label class="text-sm flex items-center gap-1 select-none">
				<input type="checkbox" bind:checked={snapEnabled} />
				Grid Snap
			</label>
			<input
				type="number"
				bind:value={snapSize}
				min="0.1"
				step="0.1"
				disabled={!snapEnabled}
				class="form-input text-sm py-0.5"
				style="width: 4rem; flex: none;"
				title="Grid size (studs)"
			/>
		</div>
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
		<div class="w-44 border-r border-[#EFE6E2] bg-white flex-shrink-0 overflow-y-auto">
			<div class="p-4">
				<h2 class="text-sm font-semibold mb-2">Explorer</h2>
				<div class="space-y-1 text-sm">
					<div class="hover:bg-gray-50 px-2 py-1 rounded-lg cursor-default"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-4 inline mb-1"><path d="M16 12v4"/><path d="M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><path d="M17 6a2 2 0 011.414.586l3 3A2 2 0 0122 11v8a2 2 0 01-2 2H4a2 2 0 01-2-2v-8a2 2 0 01.586-1.414l3-3A2 2 0 017 6z"/><path d="M2 14h20"/><path d="M8 12v4"/></svg> Workspace</div>
					{#each parts as part}
							<div
								class="ml-4 px-2 py-1 rounded-lg cursor-pointer"
								class:bg-blue-100={selectedId === part.id}
								onclick={() => selectedId = part.id}
							>
										<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-4 inline mb-1"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
								 {part.name}
							</div>
						{/each}				
					</div>
			</div>
		</div>

		<!-- Center Viewport -->
		<div class="flex-1 flex flex-col bg-gray-50 border-r border-[#EFE6E2] min-h-0 overflow-hidden">
			<div class="relative flex-1 min-h-0">
				<canvas
					bind:this={canvas}
					class="absolute inset-0 w-full h-full block"
				></canvas>
			</div>
			<!-- Script Editor (Bottom of viewport) -->
			<div class="border-t border-[#EFE6E2] bg-white flex-shrink-0" style="height: 90px;">
				<div class="p-2 h-full flex flex-col">
					<h2 class="text-sm font-semibold mb-1">Script Editor</h2>
					<textarea class="form-input font-mono text-xs flex-1 resize-none" readonly style="font-family: monospace;">print("Hello, world!")
wait(1)
part.BrickColor = "Bright red"</textarea>
				</div>
			</div>
		</div>

		<!-- Right Properties -->
		<div class="w-48 border-l border-[#EFE6E2] bg-white flex-shrink-0 overflow-y-auto">
			{#if selected}
			<div class="p-4">
				<h2 class="text-sm font-semibold mb-2">Properties</h2>
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

</div>