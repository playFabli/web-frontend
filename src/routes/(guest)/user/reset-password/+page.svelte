<script lang="ts">
	import { config } from '$lib/config';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let token = $state(data.token || '');
	let password = $state('');
	let confirm = $state('');
	let error = $state('');
	let success = $state('');
	let loading = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		success = '';
		loading = true;

		if (password !== confirm) {
			error = 'Passwords do not match.';
			loading = false;
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters.';
			loading = false;
			return;
		}

		try {
			const response = await fetch(`${config.api}/auth/reset-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
				body: JSON.stringify({ token, password, password_confirmation: confirm })
			});

			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				error = data?.message || 'Something went wrong. Please try again.';
				return;
			}

			success = 'Password reset successfully! Redirecting to login...';
			setTimeout(() => goto('/user/login'), 1500);
		} catch (err) {
			error = 'Unable to connect. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<main class="py-8">
	<div class="max-w-container mx-auto px-4">
		<div class="text-center mb-5">
			<h1 class="text-2xl font-bold text-gray-900">Reset password</h1>
			<p class="text-sm text-gray-600 mt-1">Enter your new password below.</p>
		</div>

		<div class="border border-gray-200 rounded p-5 bg-white">
			<form onsubmit={handleSubmit}>
				{#if error}
					<div class="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
						{error}
					</div>
				{/if}
				{#if success}
					<div class="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
						{success}
					</div>
				{/if}
				<div class="mb-3">
					<label class="form-label" for="password">New Password</label>
					<input bind:value={password} type="password" id="password" class="form-input" placeholder="At least 6 characters" required>
				</div>
				<div class="mb-4">
					<label class="form-label" for="confirm">Confirm Password</label>
					<input bind:value={confirm} type="password" id="confirm" class="form-input" placeholder="Re-enter password" required>
				</div>
				<button type="submit" class="btn-glossy w-full py-2 text-sm" disabled={loading}>
					{#if loading}
						Resetting...
					{:else}
						Reset Password
					{/if}
				</button>
			</form>
		</div>
	</div>
</main>