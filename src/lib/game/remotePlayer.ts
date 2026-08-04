import { Vector3, Scalar } from '@babylonjs/core';
import type { TransformNode } from '@babylonjs/core';

/**
 * Other players don't get moved directly - the server only sends us
 * position snapshots at ~20Hz. We lerp toward the latest snapshot every
 * frame so remote players glide smoothly instead of visibly teleporting
 * between network updates.
 */
export class RemotePlayer {
	private targetPosition: Vector3;
	private targetRotationY: number;

	constructor(
		public readonly id: string,
		public readonly root: TransformNode,
		position: Vector3,
		rotationY: number
	) {
		this.root.position.copyFrom(position);
		this.root.rotation.y = rotationY;
		this.targetPosition = position.clone();
		this.targetRotationY = rotationY;
	}

	setTarget(position: Vector3, rotationY: number) {
		this.targetPosition.copyFrom(position);
		this.targetRotationY = rotationY;
	}

	update(dt: number) {
		const t = Scalar.Clamp(dt * 12, 0, 1);
		this.root.position = Vector3.Lerp(this.root.position, this.targetPosition, t);
		this.root.rotation.y = Scalar.LerpAngle(this.root.rotation.y, this.targetRotationY, t);
	}

	dispose() {
		this.root.dispose();
	}
}
