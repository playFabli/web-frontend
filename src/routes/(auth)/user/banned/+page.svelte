<script lang="ts">
	import { config } from '$lib/config';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	interface Ban {
		id: number;
		reason: string;
		banned_at: string;
		expires_at: string | null;
	}

	let ban: Ban | null = $state(null);
	let loading = $state(true);
	let error = $state('');
	let actionLoading = $state(false);

	onMount(async () => {
		try {
			const res = await fetch(`${config.api}/user/ban-status`, {
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token}`
				}
			});
			const json = await res.json();
			
			if (res.ok && json.data?.ban) {
				ban = json.data.ban;
			}
		} catch (e) {
			error = 'Failed to load ban details';
		} finally {
			loading = false;
		}
	});

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return 'Never';
		return d.toLocaleDateString(undefined, { 
			year: 'numeric', 
			month: 'short', 
			day: 'numeric' 
		});
	}

	function isExpired(): boolean {
		if (!ban?.expires_at) return false;
		const expires = new Date(ban.expires_at);
		return expires < new Date();
	}

	async function reinstate() {
		actionLoading = true;
		try {
			const res = await fetch(`${config.api}/user/unban`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token}`
				}
			});
			
			if (res.ok) {
				window.location.href = '/user/homepage';
			}
		} catch (e) {
			console.error('Failed to reinstate');
		} finally {
			actionLoading = false;
		}
	}
</script>

<style>
	.ban-detail {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0;
		border-b: 1px solid #f3f4f6;
	}
	.ban-detail:last-child {
		border-bottom: none;
	}
</style>

<main class="flex-1 flex items-center justify-center py-6">
	<div class="max-w-[70%] mx-auto px-4 w-full">
		<div class="max-w-md mx-auto border border-red-200 rounded-lg p-4 bg-white text-center">
			<p class="text-4xl mb-3">🚫</p>
			<h1 class="text-xl font-bold text-gray-900 mb-2">Your Account Has Been Banned</h1>
			<p class="text-sm text-gray-600 mb-4">
				You have violated the Fabli Terms of Service and your account has been suspended.
			</p>

			{#if loading}
				<p class="text-sm text-gray-500">Loading ban details...</p>
			{:else if error}
				<p class="text-sm text-red-500">{error}</p>
			{:else if ban}
				<!-- Ban Details -->
				<div class="border-t border-gray-100 pt-4 mb-4 text-left text-sm space-y-1">
					<div class="ban-detail">
						<span class="text-gray-600 font-medium">Reason:</span>
						<span class="text-gray-900">{ban.reason || 'No reason provided'}</span>
					</div>
					<div class="ban-detail">
						<span class="text-gray-600 font-medium">Banned At:</span>
						<span class="text-gray-900">{formatDate(ban.banned_at)}</span>
					</div>
					<div class="ban-detail">
						<span class="text-gray-600 font-medium">Expires:</span>
						<span class="text-gray-900">{formatDate(ban.expires_at)}</span>
					</div>
				</div>

				<p class="text-xs text-gray-500 mb-4">
					{#if isExpired()}
						Your ban has expired. You can reinstate your account.
					{:else}
						If you believe this is a mistake, you can contact support to appeal the ban.
					{/if}
				</p>

				<button 
					onclick={reinstate} 
					disabled={actionLoading}
					class="btn-glossy px-6 py-2 text-sm"
				>
					{#if isExpired()}
						Reinstate Account
					{:else}
						Appeal Ban
					{/if}
				</button>
			{/if}
		</div>
	</div>
</main>