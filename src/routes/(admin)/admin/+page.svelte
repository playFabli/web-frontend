<script>
	import { config } from '$lib/config';
	let { data } = $props();
	let dauHistory = $state(null);
	let showModal = $state(false);
	let loadingChart = $state(false);

	const formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	async function openDauHistory() {
		if (dauHistory) {
			showModal = true;
			return;
		}

		loadingChart = true;
		showModal = true;

		try {
			const res = await fetch(`${config.api}/admin/dau-history`, {
				headers: {
					'Authorization': `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});

			if (!res.ok) throw new Error('Failed to load DAU history');

			const json = await res.json();
			dauHistory = json.data;
		} catch (e) {
			console.error(e);
		} finally {
			loadingChart = false;
		}
	}

	function closeModal() {
		showModal = false;
	}

	function getMaxCount() {
		if (!dauHistory || dauHistory.length === 0) return 1;
		return Math.max(...dauHistory.map(d => d.count), 1);
	}

	function formatDate(dateStr) {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<main class="py-6">
	<div class="max-w-container mx-auto px-4">
		<h1 class="text-xl font-bold text-gray-900 mb-5">Admin Dashboard</h1>

		<!-- Quick link cards to admin sections -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
			<a href="/admin/users" class="admin-link-card card-shadow flex flex-col items-start">
				<span class="text-lg font-semibold text-accent">Users</span>
				<p class="text-sm text-gray-600 mt-1">Manage accounts, moderators, bans</p>
			</a>
			<a href="/admin/assets" class="admin-link-card card-shadow flex flex-col items-start">
				<span class="text-lg font-semibold text-accent">Assets</span>
				<p class="text-sm text-gray-600 mt-1">Review items, reports, marketplace</p>
			</a>
			<a href="/admin/categories" class="admin-link-card card-shadow flex flex-col items-start">
				<span class="text-lg font-semibold text-accent">Categories</span>
				<p class="text-sm text-gray-600 mt-1">Manage marketplace categories</p>
			</a>
			<a href="/admin/collections" class="admin-link-card card-shadow flex flex-col items-start">
				<span class="text-lg font-semibold text-accent">Collections</span>
				<p class="text-sm text-gray-600 mt-1">Manage item collections</p>
			</a>
			<a href="/admin/site-settings" class="admin-link-card card-shadow flex flex-col items-start">
				<span class="text-lg font-semibold text-accent">Site Settings</span>
				<p class="text-sm text-gray-600 mt-1">General configuration, maintenance</p>
			</a>
		</div>

		<!-- Statistics Row -->
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
			<div class="stat-card card-shadow">
				<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Users</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">{formatter.format(data.stats.total_users)}</p>
			</div>
			<div class="stat-card card-shadow cursor-pointer" onclick={openDauHistory} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && openDauHistory()}>
				<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">DAU (Today)</p>
				<p class="text-2xl font-bold text-accent mt-1">{formatter.format(data.stats.daily_active_users)}</p>
				<p class="text-xs text-gray-400 mt-1">Click for history →</p>
			</div>
			<div class="stat-card card-shadow">
				<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Items</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">{formatter.format(data.stats.total_items)}</p>
			</div>
			<div class="stat-card card-shadow">
				<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Inventory</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">{formatter.format(data.stats.total_inventory)}</p>
			</div>
			<div class="stat-card card-shadow">
				<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending Items</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">{formatter.format(data.stats.pending_items)}</p>
			</div>
			<div class="stat-card card-shadow">
				<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Bans</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">{formatter.format(data.stats.total_bans)}</p>
			</div>
			<div class="stat-card card-shadow">
				<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin Logs</p>
				<p class="text-2xl font-bold text-gray-900 mt-1">{formatter.format(data.stats.total_logs)}</p>
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="border border-gray-200 rounded p-4 bg-white card-shadow">
			<h2 class="text-sm font-semibold text-accent mb-3">Quick Actions</h2>
			<div class="flex flex-wrap gap-2">
				<a href="/admin/users" class="btn-secondary px-4 py-1.5 text-sm">Manage Users</a>
				<a href="/admin/users/pending" class="btn-secondary px-4 py-1.5 text-sm bg-amber-50 hover:bg-amber-100 border-amber-200">Pending Transactions</a>
				<a href="/admin/logs" class="btn-secondary px-4 py-1.5 text-sm">View Admin Logs</a>
			</div>
		</div>
	</div>
</main>

<!-- DAU History Modal -->
{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={closeModal}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2 class="text-lg font-bold text-gray-900">DAU History (Last 30 Days)</h2>
				<button class="modal-close" onclick={closeModal}>✕</button>
			</div>
			<div class="modal-body">
				{#if loadingChart}
					<div class="flex items-center justify-center py-12">
						<p class="text-gray-500">Loading chart data...</p>
					</div>
				{:else if dauHistory && dauHistory.length > 0}
					{@const maxCount = getMaxCount()}
					{@const barHeight = 160}
					<div class="chart-container">
						<div class="chart-y-labels">
							{#each [maxCount, Math.round(maxCount / 2), 0] as label}
								<span class="chart-y-label">{formatter.format(label)}</span>
							{/each}
						</div>
						<div class="chart-bars-wrapper">
							<div class="chart-grid-lines">
								{#each [0, 1, 2] as i}
									<div class="chart-grid-line" style="top: {i * (barHeight / 2)}px"></div>
								{/each}
							</div>
							<div class="chart-bars">
								{#each dauHistory as day}
									{@const pct = maxCount > 0 ? (day.count / maxCount) * 100 : 0}
									<div class="chart-bar-group" title="{formatDate(day.date)}: {formatter.format(day.count)} users">
										<div class="chart-bar" style="height: {pct}%; max-height: {barHeight}px;"></div>
										<span class="chart-bar-label">{formatDate(day.date)}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else}
					<div class="flex items-center justify-center py-12">
						<p class="text-gray-500">No DAU history data available yet.</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

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
	.admin-link-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		padding: 1.25rem;
		text-decoration: none;
		color: inherit;
		transition: box-shadow 0.15s ease;
	}
	.admin-link-card:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.07);
		border-color: #a2574f;
	}

	/* Modal overlay */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	.modal-content {
		background: white;
		border-radius: 8px;
		width: 90%;
		max-width: 720px;
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
	}
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid #e5e7eb;
	}
	.modal-close {
		background: none;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		color: #6b7280;
		padding: 0.25rem;
		line-height: 1;
	}
	.modal-close:hover {
		color: #111827;
	}
	.modal-body {
		padding: 1.25rem;
		overflow-y: auto;
		flex: 1;
	}

	/* Chart styles */
	.chart-container {
		display: flex;
		gap: 0.5rem;
		align-items: stretch;
		min-height: 200px;
	}
	.chart-y-labels {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding-right: 0.5rem;
		min-width: 48px;
		text-align: right;
	}
	.chart-y-label {
		font-size: 0.75rem;
		color: #6b7280;
		line-height: 1;
	}
	.chart-bars-wrapper {
		flex: 1;
		position: relative;
		overflow-x: auto;
		padding-bottom: 1.5rem;
	}
	.chart-grid-lines {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 1.5rem;
		pointer-events: none;
	}
	.chart-grid-line {
		position: absolute;
		left: 0;
		right: 0;
		border-top: 1px dashed #e5e7eb;
	}
	.chart-bars {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		min-height: 160px;
		padding-top: 0.5rem;
	}
	.chart-bar-group {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 18px;
	}
	.chart-bar {
		width: 100%;
		max-width: 32px;
		background: #a2574f;
		border-radius: 2px 2px 0 0;
		min-height: 2px;
		transition: background 0.15s ease;
	}
	.chart-bar-group:hover .chart-bar {
		background: #8b4540;
	}
	.chart-bar-label {
		font-size: 0.6rem;
		color: #9ca3af;
		margin-top: 4px;
		white-space: nowrap;
		transform: rotate(-45deg);
		transform-origin: top left;
		position: relative;
		top: 4px;
		left: 0;
	}
</style>