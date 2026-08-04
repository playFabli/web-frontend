<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createGame, type GameHandle } from './engine';

	let {
		gameId,
		serverUrl = 'ws://localhost:8080',
		playerName = 'Player'
	}: {
		gameId: string;
		serverUrl?: string;
		playerName?: string;
	} = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let handle: GameHandle | null = null;
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(() => {
		if (!canvas) return;
		createGame(canvas, gameId, { serverUrl, playerName })
			.then((h) => {
				handle = h;
				loading = false;
			})
			.catch((e) => {
				error = e instanceof Error ? e.message : String(e);
				loading = false;
			});
	});

	onDestroy(() => {
		handle?.dispose();
	});
</script>

<div class="game-wrapper">
	<canvas bind:this={canvas}></canvas>

	{#if loading}
		<div class="overlay">Loading world…</div>
	{/if}

	{#if error}
		<div class="overlay overlay--error">Couldn't connect: {error}</div>
	{/if}
</div>

<style>
	.game-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
	}

	canvas {
		width: 100%;
		height: 100%;
		display: block;
		outline: none;
		touch-action: none;
	}

	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		background: rgba(10, 12, 16, 0.6);
		font: 500 15px/1.4 system-ui, sans-serif;
		pointer-events: none;
	}

	.overlay--error {
		background: rgba(90, 20, 20, 0.75);
	}
</style>
