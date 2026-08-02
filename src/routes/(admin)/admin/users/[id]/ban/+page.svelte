<script lang="ts">
	import { config } from '$lib/config';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let reason = $state('');
	let duration = $state('permanent');
	let error = $state('');
	let loading = $state(false);

	function getExpiresAt(durationValue: string): string | null {
		if (durationValue === 'permanent') return null;
		
		const now = new Date();
		const days = parseInt(durationValue.replace('d', ''));
		now.setDate(now.getDate() + days);
		return now.toISOString();
	}

	async function confirmBan() {
		error = '';
		loading = true;

		try {
			const response = await fetch(`${config.api}/admin/users/${data.user.id}/ban`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				},
				body: JSON.stringify({
					banned_for: reason || 'No reason given',
					expires_at: getExpiresAt(duration)
				})
			});

			const json = await response.json();
			if (!response.ok) {
				error = json?.message || 'Failed to ban user.';
				return;
			}

			goto('/admin/users');
		} catch (err) {
			console.error('Failed to ban user.', err);
			error = 'Failed to ban user.';
		} finally {
			loading = false;
		}
	}
</script>

<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> ›
			<a href="/admin/users" class="hover:text-primary">Users</a> ›
			<a href={`/admin/users/${data.user.id}/edit`} class="hover:text-primary">Edit {data.user.username}</a> ›
			<span class="text-gray-700">Ban</span>
		</div>

		<div class="max-w-lg mx-auto">
			<div class="border border-red-200 rounded-lg bg-red-50/30 p-5 card-shadow">
				<h1 class="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
					Ban User
				</h1>
				<p class="text-sm text-gray-600 mb-4">
					You are about to ban <strong class="text-primary">{data.user.username}</strong> (ID: #{data.user.id}). This action will prevent them from logging in and interacting with the platform.
				</p>

				{#if error}
					<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
				{/if}

				<div class="space-y-4">
					<div>
						<label class="form-label" for="reason">Reason</label>
						<textarea bind:value={reason} id="reason" rows="3" class="form-input" placeholder="Explain why this user is being banned..."></textarea>
					</div>

					<div>
						<label class="form-label" for="duration">Duration</label>
						<select bind:value={duration} id="duration" class="form-input">
							<option value="1d">1 day</option>
							<option value="3d">3 days</option>
							<option value="7d">7 days</option>
							<option value="30d">30 days</option>
							<option value="permanent" selected>Permanent</option>
						</select>
					</div>

					<div class="flex justify-end gap-4 pt-2">
						<a href={`/admin/users/${data.user.id}/edit`} class="btn-secondary px-4 py-1 text-sm">Back</a>
						<button onclick={confirmBan} disabled={loading} class="btn-danger px-4 py-1 text-sm">
							{#if loading}Banning...{:else}Confirm Ban{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>