import { Vector3, Ray, MeshBuilder } from '@babylonjs/core';
import type { Scene, TransformNode, Camera, Mesh } from '@babylonjs/core';
import type { InputManager } from './input';

export interface PlayerControllerOptions {
	moveSpeed?: number; // units/sec (walk)
	sprintSpeed?: number; // units/sec (Shift held)
	jumpSpeed?: number; // initial upward velocity
	gravity?: number; // units/sec^2 (negative)
}

/**
 * Drives an invisible capsule collider around with Babylon's built-in
 * ellipsoid-based `moveWithCollisions`, and parents the visible avatar
 * model to it. No physics engine dependency (Havok/Cannon) needed for
 * this simple case - just enough to walk around and jump on flat-ish
 * terrain. Swap in a real physics plugin later if you need slopes,
 * stairs, or pushable objects.
 *
 * Controls (ROBLOX-style):
 *   - WASD / Arrow keys: move relative to camera
 *   - Space: jump
 *   - Shift: sprint
 */
export class PlayerController {
	public readonly collider: Mesh;
	private verticalVelocity = 0;
	private grounded = false;

	private readonly moveSpeed: number;
	private readonly sprintSpeed: number;
	private readonly jumpSpeed: number;
	private readonly gravity: number;

	constructor(
		private scene: Scene,
		private camera: Camera,
		private input: InputManager,
		public readonly modelRoot: TransformNode,
		opts: PlayerControllerOptions = {}
	) {
		this.moveSpeed = opts.moveSpeed ?? 4.5;
		this.sprintSpeed = opts.sprintSpeed ?? 7.5;
		this.jumpSpeed = opts.jumpSpeed ?? 7;
		this.gravity = opts.gravity ?? -18;

		// Invisible capsule collider. Its own mesh geometry is irrelevant to
		// physics here - what matters for Babylon's collision system is the
		// `ellipsoid` / `ellipsoidOffset` pair below.
		this.collider = MeshBuilder.CreateCapsule('playerCollider', { height: 2.4, radius: 0.5 }, scene);
		this.collider.isVisible = false;
		this.collider.isPickable = false;
		this.collider.checkCollisions = true;
		this.collider.ellipsoid = new Vector3(0.5, 1.2, 0.5);
		this.collider.ellipsoidOffset = new Vector3(0, 1.2, 0);
		// Treat collider.position as the character's FEET position.
		this.collider.position = new Vector3(0, 5, 0); // spawn above ground, fall into place

		modelRoot.parent = this.collider;
		modelRoot.position = Vector3.Zero(); // avatar.obj already has feet at local y=0
	}

	get position(): Vector3 {
		return this.collider.position;
	}

	get facing(): number {
		return this.modelRoot.rotation.y;
	}

	update(dt: number) {
		if (dt <= 0) return;

		// Movement direction relative to where the camera is looking
		// (flattened to the XZ plane so looking up/down doesn't affect speed).
		const forward = this.camera.getDirection(Vector3.Forward());
		forward.y = 0;
		forward.normalize();
		const right = this.camera.getDirection(Vector3.Right());
		right.y = 0;
		right.normalize();

		let moveDir = Vector3.Zero();
		if (this.input.isDown('KeyW') || this.input.isDown('ArrowUp')) moveDir = moveDir.add(forward);
		if (this.input.isDown('KeyS') || this.input.isDown('ArrowDown')) moveDir = moveDir.subtract(forward);
		if (this.input.isDown('KeyD') || this.input.isDown('ArrowRight')) moveDir = moveDir.add(right);
		if (this.input.isDown('KeyA') || this.input.isDown('ArrowLeft')) moveDir = moveDir.subtract(right);
		if (moveDir.lengthSquared() > 0) moveDir.normalize();

		// Gravity integration
		this.verticalVelocity += this.gravity * dt;
		if (this.grounded && this.verticalVelocity < 0) this.verticalVelocity = 0;

		// Jump
		if (this.input.isDown('Space') && this.grounded) {
			this.verticalVelocity = this.jumpSpeed;
			this.grounded = false;
		}

		// Sprint with Shift (ROBLOX-style fast movement)
		const speed = this.input.isSprinting() ? this.sprintSpeed : this.moveSpeed;

		const displacement = moveDir.scale(speed * dt);
		displacement.y = this.verticalVelocity * dt;

		const beforeY = this.collider.position.y;
		this.collider.moveWithCollisions(displacement);
		const actualDy = this.collider.position.y - beforeY;

		// If we were moving down but got stopped short by a collision, we've
		// landed. Otherwise fall back to a short downward raycast (handles
		// the "standing still on flat ground" case where displacement.y is
		// already ~0 so the comparison above can't tell us anything).
		if (this.verticalVelocity <= 0) {
			const stoppedByFloor = Math.abs(actualDy - displacement.y) > 0.001;
			this.grounded = stoppedByFloor || this.groundedRaycast();
		} else {
			this.grounded = false;
		}

		// Face the direction we're moving in.
		if (moveDir.lengthSquared() > 0.0001) {
			this.modelRoot.rotation.y = Math.atan2(moveDir.x, moveDir.z);
		}
	}

	private groundedRaycast(): boolean {
		const origin = this.collider.position.add(new Vector3(0, 0.05, 0));
		const ray = new Ray(origin, Vector3.Down(), 1.3);
		const hit = this.scene.pickWithRay(ray, (m) => m.isPickable && m !== this.collider);
		return !!hit?.hit;
	}

	dispose() {
		this.collider.dispose();
	}
}