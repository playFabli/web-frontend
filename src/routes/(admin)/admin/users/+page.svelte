<script>
	import { goto } from '$app/navigation';
	import { config } from '$lib/config.js';

	let { data } = $props();

	let searchQuery = $state('');
	let selectedRole = $state('');
	let usersPromise = $state(Promise.resolve(data.users));

	const formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	async function fetchUsers(page = 1) {
		const params = new URLSearchParams();
		if (searchQuery) params.set('query', searchQuery);
		if (selectedRole) params.set('role', selectedRole);
		params.set('page', page.toString());

		const response = await fetch(`${config.api}/admin/users?${params.toString()}`, {
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

	function applyFilters() {
		usersPromise = fetchUsers(1);
	}

	function getRoleClass(role) {
		if (role === 'admin') return 'role-admin';
		if (role === 'moderator') return 'role-mod';
		return 'role-user';
	}

	function getStatusLabel(user) {
		return user.bans_count > 0 ? 'Banned' : 'Active';
	}

	function getStatusClass(user) {
		return user.bans_count > 0 ? 'status-banned' : 'status-active';
	}

	function formatDate(dateStr) {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	async function unbanUserFromList(userId) {
		if (!confirm('Are you sure you want to unban this user?')) return;

		try {
			const response = await fetch(`${config.api}/admin/users/${userId}/unban`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				}
			});

			if (!response.ok) {
				const json = await response.json();
				alert(json?.message || 'Failed to unban user.');
				return;
			}

			// Refresh the list
			usersPromise = fetchUsers();
		} catch (err) {
			console.error('Failed to unban user.', err);
			alert('Failed to unban user.');
		}
	}
</script>

<main class="py-6">
	<div class="max-w-container mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> ›
			<span class="text-gray-700">Users</span>
		</div>

		<h1 class="text-xl font-bold text-gray-900 mb-5">Manage Users</h1>

		<!-- Filters & Search -->
		<div class="border border-gray-200 rounded p-3 mb-4 bg-white card-shadow flex flex-wrap gap-3 items-end">
			<div class="flex-1 min-w-[200px]">
				<label class="block text-xs font-semibold text-gray-600 mb-1">Search</label>
				<input bind:value={searchQuery} type="text" placeholder="Username or email..." class="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
			</div>
			<div>
				<label class="block text-xs font-semibold text-gray-600 mb-1">Role</label>
				<select bind:value={selectedRole} class="border border-gray-300 rounded px-3 py-1.5 text-sm">
					<option value="">All</option>
					<option value="admin">Admin</option>
					<option value="moderator">Moderator</option>
					<option value="user">User</option>
				</select>
			</div>
			<button onclick={applyFilters} class="btn-secondary px-4 py-1.5 text-sm">Apply Filters</button>
		</div>

		<!-- Users Table -->
		<div class="border border-gray-200 rounded overflow-hidden">
			<table class="users-table">
				<thead>
					<tr>
						<th class="w-12">ID</th>
						<th>User</th>
						<th>Role</th>
						<th>Status</th>
						<th class="hidden sm:table-cell">Joined</th>
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
										<span class="font-medium text-gray-900">{user.username} {#if user.pending_transactions_count > 0} <strong>(!)</strong> {/if}</span>
									</div>
								</td>
								<td><span class="role-badge {getRoleClass(user.role)}">{user.role}</span></td>
								<td><span class="status-dot {getStatusClass(user)}"></span> {getStatusLabel(user)}</td>
								<td class="hidden sm:table-cell text-sm text-gray-600">{formatDate(user.created_at)}</td>
								<td class="text-right">
									<div class="flex gap-1 justify-end">
										<a href={`/admin/users/${user.id}/edit`} class="btn-secondary px-2 py-1 text-xs">Edit</a>
										{#if user.bans_count > 0}
											<button onclick={() => unbanUserFromList(user.id)} class="btn-secondary px-2 py-1 text-xs bg-green-100 hover:bg-green-200 border-green-300">Unban</button>
										{:else}
											<a href={`/admin/users/${user.id}/ban`} class="btn-danger px-2 py-1 text-xs">Ban</a>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
						{#if users.data.length === 0}
							<tr>
								<td colspan="6" class="text-center text-gray-500 py-4">No users found.</td>
							</tr>
						{/if}
					{/await}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#await usersPromise then users}
		<div class="flex items-center justify-between mt-4">
			<span class="text-sm text-gray-600">Showing {((users.current_page - 1) * users.per_page) + 1}–{Math.min(users.current_page * users.per_page, users.total)} of {formatter.format(users.total)} users</span>
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
	.users-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.users-table th {
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
	.users-table td {
		border-bottom: 1px solid #f3f4f6;
		padding: 0.6rem 0.75rem;
		vertical-align: middle;
	}
	.users-table tr:hover td {
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

	.status-dot {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		margin-right: 4px;
	}
	.status-active {
		background: #22c55e;
	}
	.status-banned {
		background: #ef4444;
	}
</style>