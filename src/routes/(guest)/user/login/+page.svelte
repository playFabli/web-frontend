<script lang="ts">
	import { goto, invalidateAll } from "$app/navigation";
	import { config } from "$lib/config";

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

			const data = await response.json();
			loading = false;

			if (!response.ok) {
				error = data?.message || 'Login failed. Please check your credentials.';
				return;
			}

			document.cookie = `token=${encodeURIComponent(data.token)}; path=/; max-age=604800; Secure; SameSite=Strict`;
			await goto("/user/homepage");
			await invalidateAll();
		} catch (err) {
			loading = false;
			error = 'Unable to connect. Please try again.';
		} finally {
			loading = false;
		}
	}

</script>
<main class="py-8">
	<div class="max-w-[70%] mx-auto px-4">
		<div class="login-container">
			<div class="text-center mb-5">
				<h1 class="text-2xl font-bold text-gray-900">Welcome back</h1>
				<p class="text-sm text-gray-600 mt-1">Log in to your Fabli account.</p>
			</div>

			<div class="border border-[#EFE6E2] rounded-lg p-5 bg-white">
				<form onsubmit={login}>
					{#if error}
						<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
							{error}
						</div>
					{/if}
					<div class="mb-3">
						<label class="form-label" for="username">Username or Email</label>
						<input bind:value={username} type="text" id="username" class="form-input" placeholder="you@example.com" required>
					</div>
					<div class="mb-4">
						<label class="form-label" for="password">Password</label>
						<input bind:value={password} type="password" id="password" class="form-input" placeholder="Enter your password" required>
					<div class="mt-1 text-right">
						<a href="/user/forgot-password" class="text-xs text-primary hover:underline">Forgot password?</a>
					</div>
					</div>
					<button type="submit" class="btn-glossy w-full py-2 text-sm" disabled={loading}>
						{#if loading}
							Logging in...
						{:else}
							Log In
						{/if}
					</button>
				</form>
				<div class="mt-4 text-center text-sm text-gray-600">
					Don't have an account? <a href="/user/register" class="text-primary hover:underline font-bold">Register</a>
				</div>
			</div>
		</div>
	</div>
</main>