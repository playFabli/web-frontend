<script>
	import { config } from '$lib/config';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	let loading = $state(false);
	let error = $state('');
	let success = $state('');

	async function verifyTransaction(transactionId, action) {
		if (!confirm(`Are you sure you want to ${action} this transaction?`)) return;

		loading = true;
		error = '';
		success = '';

		try {
			const response = await fetch(`${config.api}/admin/transactions/${transactionId}/verify`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				},
				body: JSON.stringify({ action })
			});

			const json = await response.json();
			if (!response.ok) {
				error = json?.message || `Failed to ${action} transaction.`;
				return;
			}

			success = `Transaction ${action}d successfully.`;
			window.location.reload();
		} catch (err) {
			console.error('Failed to verify transaction.', err);
			error = `Failed to ${action} transaction.`;
		} finally {
			loading = false;
		}
	}

	function formatDate(dateStr) {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function typeLabel(type) {
		switch (type) {
			case 'clothing': return 'Clothing';
			case 'reselling': return 'Reselling';
			case 'game': return 'Game';
			default: return type;
		}
	}

	function isSuspicious(transaction) {
		// Flag if the from_user's account is less than 1 day old
		if (transaction.fromUser?.created_at) {
			const accountAge = Date.now() - new Date(transaction.fromUser.created_at).getTime();
			if (accountAge < 24 * 60 * 60 * 1000) {
				return true;
			}
		}
		// Flag if the type is clothing and the amount is 100
		if (transaction.type === 'clothing' && transaction.amount === 100) {
			return true;
		}
		return false;
	}
</script>

<main class="py-6">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> вЂє
			<a href="/admin/users" class="hover:text-primary">Users</a> вЂє
			<a href={`/admin/users/${data.userId}/edit`} class="hover:text-primary">{data.user?.username || 'User'}</a> вЂє
			<span class="text-gray-700">Verify Transactions</span>
		</div>

		<div class="flex items-center justify-between mb-5">
			<h1 class="text-xl font-bold text-gray-900">Verify Transactions for {data.user?.username || 'User'}</h1>
			<a href={`/admin/users/${data.userId}/edit`} class="btn-secondary px-4 py-1 text-sm">← Back to User</a>
		</div>

		{#if error}
			<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
		{/if}
		{#if success}
			<div class="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
		{/if}

		{#if data.transactions.length === 0}
			<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white card-shadow">
				<p class="text-sm text-gray-600">This user has no pending transactions.</p>
			</div>
		{:else}
			<div class="border border-[#EFE6E2] rounded-lg overflow-x-auto bg-white card-shadow">
				<table class="loot-table">
					<thead>
						<tr>
							<th>From</th>
							<th>Type</th>
							<th>Item ID</th>
							<th>Amount</th>
							<th>Date</th>
							<th class="text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.transactions as transaction}
						<tr class={isSuspicious(transaction) ? 'bg-red-50' : ''}>
							<td>
								<div class="flex items-center gap-2">
									<img src={config.headshotStorage + "/" + transaction.from_user_id + ".png"} alt="avatar" class="w-6 h-6 rounded-full border border-[#EFE6E2]">
									<span class="text-sm font-bold">
										{transaction.fromUser?.username || `#${transaction.from_user_id}`}
									</span>
									{#if isSuspicious(transaction)}
									<span class="px-1.5 py-0.5 text-xs font-bold text-red-700 bg-red-100 border border-red-300 rounded-lg">SUSPICIOUS</span>
									{/if}
								</div>
							</td>
							<td class="text-sm text-gray-700">{typeLabel(transaction.type)}</td>
							<td class="text-sm text-gray-600">#{transaction.item_id ?? transaction.reference_id ?? 'N/A'}</td>
							<td class="text-sm font-bold">{formatter.format(transaction.amount)}</td>
							<td class="text-sm text-gray-500">{formatDate(transaction.created_at)}</td>
							<td class="text-right">
								<div class="flex gap-1 justify-end">
									<button onclick={() => verifyTransaction(transaction.id, 'approve')} disabled={loading} class="btn-glossy px-2 py-1 text-xs">
										Approve
									</button>
									<button onclick={() => verifyTransaction(transaction.id, 'deny')} disabled={loading} class="btn-secondary px-2 py-1 text-xs">
										Deny
									</button>
								</div>
							</td>
						</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</main>

<style>
	.loot-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	.loot-table th {
		background-color: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		padding: 0.5rem 0.75rem;
		text-align: left;
		font-weight: 600;
		color: #4b5563;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.loot-table td {
		border-bottom: 1px solid #f3f4f6;
		padding: 0.5rem 0.75rem;
		vertical-align: middle;
	}
</style>
