<script lang="ts">
	import { goto, invalidateAll } from "$app/navigation";
	import { config } from "$lib/config";

	let { data } = $props();
	let newestUsers = data.newestUsers || [];

	let username = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function login(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		loading = true;

		try {
			const response = await fetch(`${config.api}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
				body: JSON.stringify({ username, password }),
			});

			const responseData = await response.json();
			loading = false;

			if (!response.ok) {
				error = responseData?.message || 'Login failed. Please check your credentials.';
				return;
			}

			window.localStorage.setItem('token', responseData.token);
			document.cookie = `token=${encodeURIComponent(responseData.token)}; path=/; SameSite=Lax`;
			await goto("/user/homepage");
			await invalidateAll();
		} catch (err) {
			loading = false;
			error = 'Unable to connect. Please try again.';
		} finally {
			loading = false;
		}
	}

	function handleImgError(event: Event) {
		const img = event.target as HTMLImageElement;
		const username = img.alt.charAt(0);
		img.src = `https://placehold.co/48x48/D9C5B2/1A4D4F?text=${username}`;
	}
</script>

<style>
	.header-banner {
		background: linear-gradient(180deg, #f9fafb 0%, #e5e7eb 100%);
		border-bottom: 1px solid #c7b3a0;
		padding: 1.5rem 0;
		text-align: center;
	}
	.user-avatar-small {
		width: 48px;
		height: 48px;
		border: 1px solid #d1d5db;
		background: #f9fafb;
		object-fit: cover;
	}
</style>

<main>
	<!-- 2006‑style Banner -->
	<div class="header-banner">
		<div class="max-w-container mx-auto px-4">
			<h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Build, Play, <span class="text-primary">Share</span></h1>
			<p class="text-sm text-gray-600 max-w-md mx-auto mb-4">
				Fabli is the ultimate place to create your own games, share them with the world, and play with friends.
			</p>
			<div class="flex justify-center gap-3">
				<a href="/user/register" class="btn-glossy px-6 py-2 text-sm">Join Now — It's Free!</a>
				<a href="#" class="btn-secondary px-4 py-1.5 text-sm">Learn More</a>
			</div>
		</div>
	</div>

	<div class="py-6">
		<div class="max-w-container mx-auto px-4 flex flex-col md:flex-row gap-6">
			<div class="flex-1 space-y-5">
				<div class="border border-gray-200 rounded p-4 bg-white card-shadow">
					<h2 class="text-lg font-semibold text-accent mb-2">Featured Game</h2>
					<img src="https://placehold.co/600x120/D9C5B2/1A4D4F?text=None" alt="Epic Quest" class="w-full border border-gray-200 rounded mb-2" loading="lazy">
					<div class="flex items-center justify-between">
						<div>
							<p class="font-medium text-gray-900">None</p>
							<p class="text-xs text-gray-600">by none</p>
						</div>
						<a href="#" class="btn-glossy px-4 py-1 text-xs">Play</a>
					</div>
				</div>

				<div class="border border-gray-200 rounded p-4 bg-white card-shadow">
					<h2 class="text-lg font-semibold text-accent mb-2">Newest Users</h2>
					<div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
						{#each newestUsers as user}
							<div class="text-center">
								<img src="{config.headshotStorage}/{user.id}.png" alt={user.username} class="user-avatar-small mx-auto" loading="lazy" onerror={handleImgError}>
								<p class="text-xs mt-1 truncate">{user.username}</p>
							</div>
						{/each}
					</div>
					<a href="#" class="text-xs text-primary hover:underline mt-2 inline-block">View all members →</a>
				</div>
			</div>

			<aside class="md:w-60 flex-shrink-0">
				<div class="border border-gray-200 rounded p-4 bg-white card-shadow">
					<h2 class="text-lg font-semibold text-accent mb-3">Login</h2>
					<form onsubmit={login}>
						{#if error}
							<div class="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
								{error}
							</div>
						{/if}
						<div class="mb-2">
							<input type="text" placeholder="Username or Email" class="w-full border border-gray-300 rounded px-2 py-1 text-sm" bind:value={username} required>
						</div>
						<div class="mb-2">
							<input type="password" placeholder="Password" class="w-full border border-gray-300 rounded px-2 py-1 text-sm" bind:value={password} required>
						</div>
						<button type="submit" class="btn-glossy w-full py-1 text-sm mb-2" disabled={loading}>
							{#if loading}
								Logging in...
							{:else}
								Login
							{/if}
						</button>
						<a href="#" class="text-xs text-primary hover:underline">Forgot password?</a>
					</form>
					<hr class="my-3 border-gray-200">
					<p class="text-sm text-gray-700 mb-2">New to Fabli?</p>
					<a href="/user/register" class="btn-secondary w-full py-1 text-sm text-center block">Create Account</a>
				</div>
			</aside>
		</div>
	</div>
</main>