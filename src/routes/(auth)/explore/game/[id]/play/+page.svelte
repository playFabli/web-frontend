<script lang="ts">
	import GameCanvas from '$lib/game/GameCanvas.svelte';
	// import { PUBLIC_GAME_SERVER_URL } from '$env/static/public';

	let { data }: { data: { params: { id: string } } } = $props();
</script>

<svelte:head>
	<title>Game {data.params.id}</title>
</svelte:head>

<div class="stage">
	<GameCanvas gameId={data.params.id} serverUrl={`ws://localhost:8080`} />
</div>

<style>
	.stage {
		position: fixed;
		inset: 0;
	}

	:global(body) {
		margin: 0;
	}
</style>
