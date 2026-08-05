<script>
	import { config } from '$lib/config.js';

	let { data } = $props();

	let usersPromise = $state(Promise.resolve(data.users));

	const formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	async function fetchUsers(page = 1) {
		const response = await fetch(`${config.api}/admin/users/pending?page=${page}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				'Authorization': `Bearer ${data.token}`
			}
		});

		const json = await response.json();
		if (!response.ok) {
			console.error(json?.message || 'Failed to fetch users.');
			return data.users;
		}

		return json || data.users;
	}

	function formatDate(dateStr) {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function formatTime(dateStr) {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
	}

	function getTypeLabel(type) {
		const labels = {
			'clothing': 'Clothing',
			'game': 'Game',
			'reselling': 'Reselling'
		};
		return labels[type] || type;
	}

	function getRoleClass(role) {
		if (role === 'admin') return 'role-admin';
		if (role === 'moderator') return 'role-mod';
		return 'role-user';
	}
</script>

<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> ›
			<a href="/admin/users" class="hover:text-primary">Users</a> ›
			<span class="text-gray-700">Pending Transactions</span>
		</div>

		<h1 class="text-xl font-bold text-gray-900 mb-5">Users with Pending Transactions</h1>

		<!-- Users Table -->
		<div class="border border-[#EFE6E2] rounded-lg overflow-hidden">
			<table class="pending-table">
				<thead>
					<tr>
						<th class="w-12">ID</th>
						<th>User</th>
						<th>Role</th>
						<th>Pending</th>
						<th class="hidden sm:table-cell">Latest Transactions</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#await usersPromise then users}
						{#each users.data as user}
							<tr>
								<td class="text-xs text-gray-500">#{user.id}</td>
								<td>
									<div class="flex items-center gap-2">
										<img src={config.headshotStorage + "/" + user.id + ".png"} alt={user.username} class="w-6 h-6 rounded-full">
										<span class="font-bold text-gray-900">{user.username}</span>
									</div>
								</td>
								<td><span class="role-badge {getRoleClass(user.role)}">{user.role}</span></td>
								<td>
									<span class="pending-count">{user.pending_transactions_count} pending</span>
								</td>
								<td class="hidden sm:table-cell">
									<div class="flex flex-col gap-0.5">
										{#each user.pending_transactions.slice(0, 3) as txn}
											<div class="text-xs text-gray-600 flex items-center gap-1">
												<span class="txn-type {txn.type}">{getTypeLabel(txn.type)}</span>
												<span class="font-bold text-amber-600">+{formatter.format(txn.amount)}</span>
												<span class="text-gray-400">·</span>
												<span class="text-gray-400">{formatDate(txn.created_at)}</span>
												{#if txn.from_user}
													<span class="text-gray-400">from</span>
													<span class="text-gray-700">{txn.from_user.username}</span>
												{/if}
											</div>
										{/each}
										{#if user.pending_transactions.length > 3}
											<span class="text-xs text-gray-400">+{user.pending_transactions.length - 3} more</span>
										{/if}
									</div>
								</td>
								<td class="text-right">
									<div class="flex gap-1 justify-end">
										<a href={`/admin/users/${user.id}/edit`} class="btn-secondary px-2 py-1 text-xs">Edit</a>
										<a href={`/admin/user/${user.id}/verify-transaction`} class="btn-secondary px-2 py-1 text-xs bg-amber-100 hover:bg-amber-200 border-amber-300">Verify</a>
									</div>
								</td>
							</tr>
						{/each}
						{#if users.data.length === 0}
							<tr>
								<td colspan="6" class="text-center text-gray-500 py-8">
									<div class="flex flex-col items-center gap-2">
										<svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span class="text-sm text-gray-500">No users with pending transactions.</span>
									</div>
								</td>
							</tr>
						{/if}
					{/await}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#await usersPromise then users}
		<div class="flex items-center justify-between mt-4">
			<span class="text-sm text-gray-600">
				Showing {((users.current_page - 1) * users.per_page) + 1}–{Math.min(users.current_page * users.per_page, users.total)} of {formatter.format(users.total)} users
			</span>
			<div class="flex gap-1">
				{#if users.prev_page_url}
					<button onclick={() => usersPromise = fetchUsers(users.current_page - 1)} class="btn-secondary px-3 py-1 text-sm">← Previous</button>
				{:else}
					<button class="btn-secondary px-3 py-1 text-sm opacity-50 cursor-not-allowed" disabled>← Previous</button>
				{/if}
				{#if users.next_page_url}
					<button onclick={() => usersPromise = fetchUsers(users.current_page + 1)} class="btn-secondary px-3 py-1 text-sm">Next →</button>
				{:else}
					<button class="btn-secondary px-3 py-1 text-sm opacity-50 cursor-not-allowed" disabled>Next →</button>
				{/if}
			</div>
		</div>
		{/await}
	</div>
</main>
<style>
	.pending-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.pending-table th {
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
	.pending-table td {
		border-bottom: 1px solid #f3f4f6;
		padding: 0.6rem 0.75rem;
		vertical-align: middle;
	}
	.pending-table tr:hover td {
		background-color: #fafafa;
	}

	.role-badge {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 600;
		padding: 0.1rem 0.5rem;
		border-radius: 3px;
		border: 1px solid;
	}
	.role-admin {
		background: #fee2e2;
		color: #991b1b;
		border-color: #fecaca;
	}
	.role-mod {
		background: #e0f2fe;
		color: #075985;
		border-color: #bae6fd;
	}
	.role-user {
		background: #f3f4f6;
		color: #374151;
		border-color: #d1d5db;
	}

	.pending-count {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #92400e;
		background: #fef3c7;
		border: 1px solid #fde68a;
		padding: 0.1rem 0.5rem;
		border-radius: 3px;
	}

	.txn-type {
		display: inline-block;
		font-size: 0.6rem;
		font-weight: 600;
		padding: 0.05rem 0.35rem;
		border-radius: 2px;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	.txn-type.clothing {
		background: #dbeafe;
		color: #1e40af;
	}
	.txn-type.game {
		background: #dcfce7;
		color: #166534;
	}
	.txn-type.reselling {
		background: #f3e8ff;
		color: #6b21a8;
	}
</style>