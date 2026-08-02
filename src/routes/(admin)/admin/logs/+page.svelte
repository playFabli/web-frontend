<script>
	import { config } from '$lib/config.js';

	let { data } = $props();

	let logsPromise = $state(Promise.resolve(data.logs));

	const formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	async function fetchLogs(page = 1) {
		const params = new URLSearchParams();
		params.set('page', page.toString());

		const response = await fetch(`${config.api}/admin/logs?${params.toString()}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				'Authorization': `Bearer ${data.token}`
			}
		});

		const json = await response.json();
		if (!response.ok) {
			console.error(json?.message || 'Failed to fetch logs.');
			return data.logs;
		}

		return json || data.logs;
	}

	function formatDate(dateStr) {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function timeSince(dateStr) {
		if (!dateStr) return '';
		const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
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
	<div class="max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> ›
			<span class="text-gray-700">Logs</span>
		</div>

		<h1 class="text-xl font-bold text-gray-900 mb-5">Admin Logs</h1>

		<!-- Logs Table -->
		<div class="border border-[#EFE6E2] rounded-lg overflow-hidden">
			<table class="logs-table">
				<thead>
					<tr>
						<th class="w-16">ID</th>
						<th>Admin</th>
						<th>Target</th>
						<th>Log</th>
						<th class="hidden sm:table-cell">Date</th>
					</tr>
				</thead>
				<tbody>
					{#await logsPromise then logs}
						{#each logs.data as log}
							<tr>
								<td class="text-xs text-gray-500">#{log.id}</td>
								<td>
									{#if log.admin}
										<div class="flex items-center gap-2">
											<img src={config.headshotStorage + "/" + log.admin.id + ".png"} alt={log.admin.username} class="w-5 h-5 rounded-full">
											<span class="font-medium text-gray-900">{log.admin.username}</span>
										</div>
									{:else}
										<span class="text-gray-500">Unknown</span>
									{/if}
								</td>
								<td>
									{#if log.target}
										<div class="flex items-center gap-2">
											<img src={config.headshotStorage + "/" + log.target.id + ".png"} alt={log.target.username} class="w-5 h-5 rounded-full">
											<span class="font-medium text-gray-900">{log.target.username}</span>
										</div>
									{:else}
										<span class="text-gray-400">—</span>
									{/if}
								</td>
								<td class="text-sm text-gray-700">{log.log}</td>
								<td class="hidden sm:table-cell text-xs text-gray-500" title={formatDate(log.created_at)}>
									{timeSince(log.created_at)}
								</td>
							</tr>
						{/each}
						{#if logs.data.length === 0}
							<tr>
								<td colspan="5" class="text-center text-gray-500 py-4">No logs found.</td>
							</tr>
						{/if}
					{/await}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#await logsPromise then logs}
		<div class="flex items-center justify-between mt-4">
			<span class="text-sm text-gray-600">Showing {((logs.current_page - 1) * logs.per_page) + 1}–{Math.min(logs.current_page * logs.per_page, logs.total)} of {formatter.format(logs.total)} logs</span>
			<div class="flex gap-1">
				{#if logs.prev_page_url}
					<button onclick={() => logsPromise = fetchLogs(logs.current_page - 1)} class="btn-secondary px-3 py-1 text-sm">← Previous</button>
				{:else}
					<button class="btn-secondary px-3 py-1 text-sm opacity-50 cursor-not-allowed" disabled>← Previous</button>
				{/if}
				{#if logs.next_page_url}
					<button onclick={() => logsPromise = fetchLogs(logs.current_page + 1)} class="btn-secondary px-3 py-1 text-sm">Next →</button>
				{:else}
					<button class="btn-secondary px-3 py-1 text-sm opacity-50 cursor-not-allowed" disabled>Next →</button>
				{/if}
			</div>
		</div>
		{/await}
	</div>
</main>

<style>
	.logs-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.logs-table th {
		background-color: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		padding: 0.6rem 0.75rem;
		text-align: left;
		font-weight: 600;
		color: #4b5563;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.logs-table td {
		border-bottom: 1px solid #f3f4f6;
		padding: 0.6rem 0.75rem;
		vertical-align: middle;
	}
	.logs-table tr:hover td {
		background-color: #fafafa;
	}
</style>