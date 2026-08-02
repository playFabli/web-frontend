<script>
	import { config } from '$lib/config.js';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	let loading = $state(false);
	let error = $state('');

	async function refresh() {
		loading = true;
		error = '';
		try {
			await invalidateAll();
		} catch (err) {
			console.error(err);
			error = 'Failed to refresh.';
		} finally {
			loading = false;
		}
	}
</script>

<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/user/homepage" class="hover:text-primary">Home</a> ›
			<span class="text-gray-700">Transactions</span>
		</div>

		<div class="flex items-center justify-between mb-5">
			<h1 class="text-xl font-bold text-gray-900">Transactions</h1>
			<button onclick={refresh} disabled={loading} class="btn-secondary px-4 py-1 text-sm">
				{#if loading}Refreshing...{:else}Refresh{/if}
			</button>
		</div>

		{#if error}
			<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
		{/if}

		{#if data.transactions}
		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
			<div class="stat-card">
				<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Revenue</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">{formatter.format(data.transactions.total)}</p>
			</div>
			<div class="stat-card">
				<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">From Clothing</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">{formatter.format(data.transactions.clothing)}</p>
			</div>
			<div class="stat-card">
				<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">From Games</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">{formatter.format(data.transactions.games)}</p>
			</div>
			<div class="stat-card">
				<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">From Reselling</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">{formatter.format(data.transactions.reselling)}</p>
			</div>
			<div class="stat-card sm:col-span-2 md:col-span-1">
				<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending</p>
				<p class="text-2xl font-bold text-yellow-700 mt-1">{formatter.format(data.transactions.pending)}</p>
				<p class="text-xs text-gray-500 mt-0.5">Awaiting moderation</p>
			</div>
		</div>

		{#if data.transactions.pending > 0}
		<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
			<h2 class="text-sm font-semibold mb-2">Pending Transactions</h2>
			<p class="text-sm text-gray-600">
				You have {formatter.format(data.transactions.pending)} pending. Revenue from clothing and reselling is reviewed by an admin before it counts toward your total.
			</p>
		</div>
		{/if}
		{:else}
		<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
			<p class="text-sm text-gray-600">Failed to load transactions.</p>
		</div>
		{/if}
	</div>
</main>

<style>
	.stat-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		padding: 1.25rem;
		transition: box-shadow 0.15s ease;
	}
	.stat-card:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.07);
	}
</style>
