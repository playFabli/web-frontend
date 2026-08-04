/**
 * Tracks currently-held keys and mouse buttons so the render loop can
 * poll input state every frame (rather than reacting to discrete events,
 * which is the wrong model for continuous movement).
 */
export class InputManager {
	private keys = new Set<string>();
	private mouseButtons = new Set<number>();
	private pointerLockActive = false;

	public onMouseMove?: (movementX: number, movementY: number) => void;
	public onPointerLockChange?: (active: boolean) => void;

	private handleKeyDown = (e: KeyboardEvent) => {
		// Prevent space from scrolling the page
		if (e.code === 'Space') e.preventDefault();
		this.keys.add(e.code);
	};
	private handleKeyUp = (e: KeyboardEvent) => {
		this.keys.delete(e.code);
	};
	private handlePointerDown = (e: PointerEvent) => {
		// Use pointer events, not mouse events: Babylon's camera calls
		// preventDefault() on pointerdown, which suppresses the compatibility
		// mousedown event entirely. Pointer events still fire regardless.
		this.mouseButtons.add(e.button);
	};
	private handlePointerUp = (e: PointerEvent) => {
		this.mouseButtons.delete(e.button);
	};
	private handlePointerMove = (e: PointerEvent) => {
		if (this.onMouseMove) this.onMouseMove(e.movementX, e.movementY);
	};
	private handlePointerLockChange = () => {
		this.pointerLockActive = document.pointerLockElement !== null;
		this.onPointerLockChange?.(this.pointerLockActive);
	};
	private handleContextMenu = (e: Event) => {
		// Suppress the browser context menu so right-drag orbit feels native.
		e.preventDefault();
	};

	constructor() {
		window.addEventListener('keydown', this.handleKeyDown);
		window.addEventListener('keyup', this.handleKeyUp);
		window.addEventListener('pointerdown', this.handlePointerDown);
		window.addEventListener('pointerup', this.handlePointerUp);
		window.addEventListener('pointermove', this.handlePointerMove);
		document.addEventListener('pointerlockchange', this.handlePointerLockChange);
		window.addEventListener('contextmenu', this.handleContextMenu);
	}

	isDown(code: string): boolean {
		return this.keys.has(code);
	}

	/** Returns true while the Shift key (either side) is held. */
	isSprinting(): boolean {
		return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
	}

	isMouseButtonDown(button: number): boolean {
		return this.mouseButtons.has(button);
	}

	/** Right mouse button (button 2) held — used for orbit-drag in ROBLOX style. */
	isRightMouseDown(): boolean {
		return this.mouseButtons.has(2);
	}

	get isPointerLocked(): boolean {
		return this.pointerLockActive;
	}

	dispose() {
		window.removeEventListener('keydown', this.handleKeyDown);
		window.removeEventListener('keyup', this.handleKeyUp);
		window.removeEventListener('pointerdown', this.handlePointerDown);
		window.removeEventListener('pointerup', this.handlePointerUp);
		window.removeEventListener('pointermove', this.handlePointerMove);
		document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
		window.removeEventListener('contextmenu', this.handleContextMenu);
		this.keys.clear();
		this.mouseButtons.clear();
	}
}