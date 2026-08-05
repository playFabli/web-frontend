<script lang="ts">
	import { config } from '$lib/config';
	import { goto } from '$app/navigation';

	let email = $state('');
	let error = $state('');
	let success = $state('');
	let loading = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		success = '';
		loading = true;

		try {
			const response = await fetch(`${config.api}/auth/forgot-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
				body: JSON.stringify({ email })
			});

			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				error = data?.message || 'Something went wrong. Please try again.';
				return;
			}

			success = 'If an account exists with that email, a reset link has been sent.';
			email = '';
		} catch (err) {
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
				<h1 class="text-2xl font-bold text-gray-900">Forgot password?</h1>
				<p class="text-sm text-gray-600 mt-1">Enter your email and we'll send you a reset link.</p>
			</div>
	
			<div class="border border-[#EFE6E2] rounded-lg p-5 bg-white">
				<form onsubmit={handleSubmit}>
					{#if error}
						<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
							{error}
						</div>
					{/if}
					{#if success}
						<div class="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
							{success}
						</div>
					{/if}
					<div class="mb-4">
						<label class="form-label" for="email">Email</label>
						<input bind:value={email} type="email" id="email" class="form-input" placeholder="you@example.com" required>
					</div>
					<button type="submit" class="btn-glossy w-full py-2 text-sm" disabled={loading}>
						{#if loading}
							Sending...
						{:else}
							Send Reset Link
						{/if}
					</button>
				</form>
				<div class="mt-4 text-center text-sm text-gray-600">
					Remember your password? <a href="/user/login" class="text-primary hover:underline font-bold">Log in</a>
				</div>
			</div>
		</div>
	</div>
</main>