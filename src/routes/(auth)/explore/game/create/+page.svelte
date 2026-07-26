<script>
	import { goto } from '$app/navigation';
	import { config } from '$lib/config.js';

	let { data } = $props();

	let title = $state('');
	let description = $state('');
	let genre = $state('Adventure');
	let maxPlayers = $state(1);
	let thumbnail = $state(null);
	let loading = $state(false);
	let error = $state('');

	async function handleSubmit(e) {
		e.preventDefault();
		loading = true;
		error = '';

		try {
			const formData = new FormData();
			formData.append('title', title);
			formData.append('description', description);
			formData.append('genre', genre);
			formData.append('max_players', maxPlayers);
			if (thumbnail) {
				formData.append('thumbnail', thumbnail);
			}

			const res = await fetch(`${config.api}/games/create`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Accept': 'application/json'
				},
				body: formData
			});

			const json = await res.json();

			if (res.ok) {
				goto(`/explore/game/${json.data.id}`);
			} else {
				error = json.message || json.error || 'Failed to create game';
			}
		} catch (e) {
			console.error('Failed to create game', e);
			error = 'Failed to create game';
		} finally {
			loading = false;
		}
	}
</script>

<main class="py-6">
	<div class="max-w-container mx-auto px-4">
		<!-- Breadcrumb -->
		<div class="text-xs text-gray-500 mb-3">
			<a href="/explore" class="hover:text-primary">Explore</a> ›
			<span class="text-gray-700">New Game</span>
		</div>

		<div class="max-w-lg mx-auto">
			<h1 class="text-xl font-bold text-gray-900 mb-5">Create New Game</h1>

			{#if error}
				<div class="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{error}
				</div>
			{/if}

			<div class="border border-gray-200 rounded p-5 bg-white card-shadow">
				<form onsubmit={handleSubmit}>
					<!-- Title -->
					<div class="mb-3">
						<label class="form-label" for="expTitle">Title</label>
						<input type="text" id="expTitle" class="form-input" placeholder="Name your game" required bind:value={title}>
					</div>

					<!-- Description -->
					<div class="mb-3">
						<label class="form-label" for="expDescription">Description</label>
						<textarea id="expDescription" rows="4" class="form-input" placeholder="Describe your game..." bind:value={description}></textarea>
					</div>

					<!-- Genre -->
					<div class="mb-3">
						<label class="form-label" for="expGenre">Genre</label>
						<select id="expGenre" class="form-input" bind:value={genre}>
							<option>Adventure</option>
							<option>Obby</option>
							<option>Tycoon</option>
							<option>RPG</option>
							<option>Showcase</option>
							<option>Horror</option>
							<option>Other</option>
						</select>
					</div>

					<!-- Max Players -->
					<div class="mb-3">
						<label class="form-label" for="expMaxPlayers">Max Players</label>
						<input type="number" id="expMaxPlayers" class="form-input" min="1" max="100" required bind:value={maxPlayers}>
					</div>

					<!-- Thumbnail Upload -->
					<div class="mb-5">
						<label class="form-label" for="expThumbnail">Thumbnail</label>
						<input type="file" id="expThumbnail" class="form-input" accept="image/*" onchange={(e) => thumbnail = e.target.files[0] || null}>
						<p class="text-xs text-gray-500 mt-1">Upload a .png or .jpg (recommended size: 600×340).</p>
					</div>

					<!-- Action Buttons -->
					<div class="flex justify-end gap-3">
						<button type="submit" class="btn-glossy px-6 py-1 text-sm" disabled={loading}>
							{#if loading}
								Creating...
							{:else}
								Enter Fabli Editor
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</main>
