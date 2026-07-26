<script>
	let { data } = $props();
	const formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	function timeSince(date) {
		const seconds = Math.floor((new Date() - new Date(date)) / 1000);
		if (seconds < 60) return 'just now';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
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
			<a href="#" class="admin-link-card card-shadow flex flex-col items-start">
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
</style>