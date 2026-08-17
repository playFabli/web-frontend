<script lang="ts">
	import { onMount } from 'svelte';
	import { mountAvatarPreview } from './avatarPreviewEngine';

	// A reusable 3D avatar showcase. Renders the current user's outfit by
	// default; pass a `userId` (e.g. 2 for the robot opponent) to materialise
	// any other avatar. Mirrors the Arena lobby showcase.
	//
	// Babylon.js is pulled in lazily inside avatarPreviewEngine, so this
	// component (and the arena pages that use it) never block their first
	// render on the 3D engine downloading.
	let {
		userId = undefined,
		token = undefined,
		height = 300,
		className = '',
		circle = false,
		mirrored = false
	} = $props<{
		userId?: number | string;
		token?: string;
		height?: number;
		className?: string;
		circle?: boolean;
		mirrored?: boolean;
	}>();

	let canvas = $state<HTMLCanvasElement>();
	let error = $state<string | null>(null);
	// Set once the Babylon engine + scene are mounted and rendering.
	let ready = $state(false);

	let dispose: (() => void) | null = null;

	onMount(() => {
		if (!canvas) return;

		let cancelled = false;

		mountAvatarPreview(canvas, {
			userId,
			token,
			onError: (msg) => (error = msg)
		})
			.then((stop) => {
				if (cancelled) {
					stop();
					return;
				}
				dispose = stop;
				ready = true;
			})
			.catch((err) => {
				console.error('Failed to mount avatar preview:', err);
				if (!cancelled) error = 'Could not load your avatar.';
			});

		return () => {
			cancelled = true;
			dispose?.();
			dispose = null;
		};
	});
</script>

<div
	class="avatar-preview"
	class:avatar-preview-circle={circle}
	class:avatar-preview-mirrored={mirrored}
	style={`height: ${height}px`}
>
	<canvas bind:this={canvas} class={className}></canvas>
	{#if !ready && !error}
		<div class="avatar-preview-loading">
			<div class="avatar-preview-spinner"></div>
		</div>
	{/if}
	{#if error}
		<div class="avatar-preview-error">{error}</div>
	{/if}
</div>

<style>
	.avatar-preview {
		position: relative;
		width: 100%;
	}

	.avatar-preview canvas {
		display: block;
		width: 100%;
		height: 100%;
		background: transparent;
		touch-action: none;
		cursor: grab;
	}

	.avatar-preview canvas:active {
		cursor: grabbing;
	}

	/* Shown while the lazily-loaded Babylon chunk is still downloading. */
	.avatar-preview-loading {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.avatar-preview-spinner {
		width: 22px;
		height: 22px;
		border-radius: 9999px;
		border: 3px solid rgba(162, 87, 79, 0.15);
		border-top-color: #a2574f;
		animation: avatar-preview-spin 0.8s linear infinite;
	}

	@keyframes avatar-preview-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.avatar-preview-error {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 8px;
		text-align: center;
		font-size: 12px;
		font-weight: 600;
		color: #dc2626;
	}

	/* Circular thumbnail variant used for fighter portraits. */
	.avatar-preview-circle {
		width: 56px;
		margin: 0 auto;
		border-radius: 9999px;
		overflow: hidden;
		border: 2px solid #fff;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	/* Mirrored variant: flips the canvas horizontally so an opponent standing
	 * on the right side of the stage faces the player on the left. */
	.avatar-preview-mirrored canvas {
		transform: scaleX(-1);
	}
</style>
