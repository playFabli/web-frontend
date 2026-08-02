<script lang="ts">
	import { config } from '$lib/config';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	let username = $state(data.user.username);
	let email = $state(data.user.email);
	let role = $state(data.user.role);
	let description = $state(data.user.description);
	let bubble = $state(data.user.bubble);
	let coins = $state(data.user.coins);
	let rap = $state(data.user.rap);
	let password = $state('');

	let error = $state('');
	let success = $state('');
	let loading = $state(false);
	let unbanLoading = $state(false);

	let recalcLoading = $state(false);
	let recalcSuccess = $state('');
	let recalcError = $state('');

	let renderLoading = $state(false);
	let renderSuccess = $state('');
	let renderError = $state('');

	let scrubLoading = $state(false);
	let scrubSuccess = $state('');
	let scrubError = $state('');

	async function saveUser() {
		error = '';
		success = '';
		loading = true;

		try {
			const body: Record<string, unknown> = { username, email, role, description, bubble, coins, rap };
			if (password) body.password = password;

			const response = await fetch(`${config.api}/admin/users/${data.user.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				},
				body: JSON.stringify(body)
			});

			const json = await response.json();
			if (!response.ok) {
				error = json?.message || 'Failed to save user.';
				if (json?.errors) {
					error = Object.values(json.errors).flat().join(', ');
				}
				return;
			}

			success = 'User updated successfully.';
		} catch (err) {
			console.error('Failed to save user.', err);
			error = 'Failed to save user.';
		} finally {
			loading = false;
		}
	}

	async function deleteUser() {
		if (!confirm('Are you sure you want to delete this account? This cannot be undone.')) return;

		try {
			const response = await fetch(`${config.api}/admin/users/${data.user.id}`, {
				method: 'DELETE',
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				}
			});

			if (!response.ok) {
				const json = await response.json();
				alert(json?.message || 'Failed to delete user.');
				return;
			}

			goto('/admin/users');
		} catch (err) {
			console.error('Failed to delete user.', err);
			alert('Failed to delete user.');
		}
	}

	async function unbanUser() {
		if (!confirm('Are you sure you want to unban this user?')) return;

		unbanLoading = true;
		error = '';

		try {
			const response = await fetch(`${config.api}/admin/users/${data.user.id}/unban`, {
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

			success = 'User unbanned successfully.';
			window.location.reload();
		} catch (err) {
			console.error('Failed to unban user.', err);
			alert('Failed to unban user.');
		} finally {
			unbanLoading = false;
		}
	}

	async function recalculateStats() {
		recalcError = '';
		recalcSuccess = '';
		recalcLoading = true;

		try {
			const response = await fetch(`${config.api}/admin/users/${data.user.id}/recalculate-stats`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				}
			});

			const json = await response.json();
			if (!response.ok) {
				recalcError = json?.message || 'Failed to recalculate stats.';
				return;
			}

			recalcSuccess = 'Stats recalculated successfully.';
		} catch (err) {
			console.error('Failed to recalculate stats.', err);
			recalcError = 'Failed to recalculate stats.';
		} finally {
			recalcLoading = false;
		}
	}

	async function scrubUser() {
		if (!confirm('Are you sure you want to scrub this user? Their username will become "Deleted{id}" and description will be reset.')) return;

		scrubError = '';
		scrubSuccess = '';
		scrubLoading = true;

		try {
			const response = await fetch(`${config.api}/admin/users/${data.user.id}/scrub`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				}
			});

			const json = await response.json();
			if (!response.ok) {
				scrubError = json?.message || 'Failed to scrub user.';
				return;
			}

			scrubSuccess = 'User scrubbed successfully.';
			window.location.reload();
		} catch (err) {
			console.error('Failed to scrub user.', err);
			scrubError = 'Failed to scrub user.';
		} finally {
			scrubLoading = false;
		}
	}

	async function renderUserAvatar() {
		renderError = '';
		renderSuccess = '';
		renderLoading = true;

		try {
			const response = await fetch(`${config.api}/admin/users/${data.user.id}/render`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${data.token}`
				}
			});

			const json = await response.json();
			if (!response.ok) {
				renderError = json?.message || 'Failed to render avatar.';
				return;
			}

			renderSuccess = 'Avatar rendered successfully.';
			setTimeout(() => window.location.reload(), 500);
		} catch (err) {
			console.error('Failed to render avatar.', err);
			renderError = 'Failed to render avatar.';
		} finally {
			renderLoading = false;
		}
	}

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}

	function isBanned(bans: unknown) {
		return Array.isArray(bans) && bans.length > 0;
	}

	const rapFormatted = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});
</script>

<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> ›
			<a href="/admin/users" class="hover:text-primary">Users</a> ›
			<span class="text-gray-700">Edit {data.user.username}</span>
		</div>

		<div class="flex items-center justify-between mb-5">
			<h1 class="text-xl font-bold text-gray-900">Edit User</h1>
			<a href="/admin/users" class="btn-secondary px-4 py-1 text-sm">← Back to Users</a>
		</div>

		{#if error}
			<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
		{/if}
		{#if success}
			<div class="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
		{/if}

		<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
			<!-- Left column: Avatar & quick info -->
			<div class="md:col-span-1">
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white text-center">
					<img src={config.avatarStorage + "/" + data.user.id + ".png"} alt={data.user.username} class="w-24 h-24 mx-auto rounded-full border-2 {isBanned(data.user.bans) ? 'border-red-500' : 'border-secondary'}">
					<h2 class="text-lg font-bold text-gray-900 mt-2">{data.user.username}</h2>
					{#if isBanned(data.user.bans)}
						<p class="text-sm text-red-600 font-medium">BANNED</p>
						<p class="text-xs text-gray-500 mt-1">Reason: {data.user.bans[0]?.banned_for || 'No reason given'}</p>
					{:else}
						<p class="text-sm text-gray-600">User since {formatDate(data.user.created_at)}</p>
					{/if}
					<div class="mt-3 text-left text-sm space-y-1">
						<p><span class="font-medium">ID:</span> #{data.user.id}</p>
						<p><span class="font-medium">Level:</span> {data.user.level}</p>
						<p><span class="font-medium">VAL:</span> {rapFormatted.format(data.user.final_rap)}</p>
					</div>
				</div>
			</div>

			<!-- Right column: Edit form -->
			<div class="md:col-span-2 space-y-4">
				<!-- Account Details -->
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
					<h2 class="text-lg font-semibold mb-3">Account Details</h2>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label class="form-label" for="username">Username</label>
							<input bind:value={username} type="text" id="username" class="form-input">
						</div>
						<div>
							<label class="form-label" for="email">Email</label>
							<input bind:value={email} type="email" id="email" class="form-input">
						</div>
						<div>
							<label class="form-label" for="new-password">New Password</label>
							<input bind:value={password} type="password" id="new-password" class="form-input" placeholder="Leave blank to keep current">
						</div>
						{#if page.data.globalUser.role == "admin"}
						<div>
							<label class="form-label" for="role">Role</label>
							<select bind:value={role} id="role" class="form-input">
								<option value="user">User</option>
								<option value="moderator">Moderator</option>
								<option value="admin">Admin</option>
							</select>
						</div>
						{/if}
					</div>
				</div>

				<!-- Profile Info -->
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
					<h2 class="text-lg font-semibold mb-3">Profile Info</h2>
					<div class="mb-3">
						<label class="form-label" for="description">Description</label>
						<textarea bind:value={description} id="description" class="form-input" rows="3"></textarea>
					</div>
					<div class="mb-3">
						<label class="form-label" for="bubble">Bubble</label>
						<input bind:value={bubble} type="text" id="bubble" class="form-input">
					</div>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label class="form-label" for="coins">Currency</label>
							<input bind:value={coins} type="number" id="coins" class="form-input" min="0">
						</div>
					</div>
				</div>

				<!-- Transactions -->
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
					<h2 class="text-lg font-semibold mb-2">Transactions</h2>
					<p class="text-sm text-gray-600 mb-3">Review and verify pending transactions for this user.</p>
					<a href={`/admin/user/${data.user.id}/verify-transaction`} class="btn-glossy px-4 py-1 text-sm">Verify Transactions</a>
				</div>

				<!-- User Stats & Rendering -->
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
					<h2 class="text-lg font-semibold mb-2">User Stats & Rendering</h2>
					<p class="text-sm text-gray-600 mb-3">Recalculate RAP/item count, or re-render the user's avatar.</p>
					<div class="flex flex-wrap gap-2">
						<button onclick={recalculateStats} disabled={recalcLoading} class="btn-glossy px-4 py-1 text-sm">
							{#if recalcLoading}Recalculating...{:else}Recalculate Stats{/if}
						</button>
						<button onclick={renderUserAvatar} disabled={renderLoading} class="btn-glossy px-4 py-1 text-sm">
							{#if renderLoading}Rendering...{:else}Render Avatar{/if}
						</button>
					</div>
					{#if recalcError}
						<div class="mt-2 text-sm text-red-700">{recalcError}</div>
					{/if}
					{#if recalcSuccess}
						<div class="mt-2 text-sm text-green-700">{recalcSuccess}</div>
					{/if}
					{#if renderError}
						<div class="mt-2 text-sm text-red-700">{renderError}</div>
					{/if}
					{#if renderSuccess}
						<div class="mt-2 text-sm text-green-700">{renderSuccess}</div>
					{/if}
				</div>

				<!-- Danger Zone -->
				<div class="border border-red-200 rounded-lg p-4 bg-red-50/30">
					<h2 class="text-lg font-semibold text-red-700 mb-2">Danger Zone</h2>
					<div class="flex flex-wrap gap-2">
						{#if isBanned(data.user.bans)}
							<button onclick={unbanUser} disabled={unbanLoading} class="btn-secondary px-4 py-1 text-sm bg-green-100 hover:bg-green-200 border-green-300">
								{#if unbanLoading}Unbanning...{:else}Unban User{/if}
							</button>
						{:else}
							<a href={`/admin/users/${data.user.id}/ban`} class="btn-danger px-4 py-1 text-sm">Ban User</a>
						{/if}
						{#if page.data.globalUser.role == "admin"}
						<button onclick={deleteUser} class="btn-danger px-4 py-1 text-sm">Delete Account</button>
						{/if}
						<button onclick={scrubUser} disabled={scrubLoading} class="btn-danger px-4 py-1 text-sm">
							{#if scrubLoading}Scrubbing...{:else}Scrub User{/if}
						</button>
					</div>
					{#if scrubError}
						<div class="mt-2 text-sm text-red-700">{scrubError}</div>
					{/if}
					{#if scrubSuccess}
						<div class="mt-2 text-sm text-green-700">{scrubSuccess}</div>
					{/if}
					<!-- <p class="text-xs text-gray-600 mt-2">These actions cannot be undone. Proceed with caution.</p> -->
				</div>

				<!-- Save Button -->
				<div class="flex justify-end gap-4">
					<a href="/admin/users" class="btn-secondary px-4 py-1 text-sm">Cancel</a>
					<button onclick={saveUser} disabled={loading} class="btn-glossy px-4 py-1 text-sm">
						{#if loading}Saving...{:else}Save Changes{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
</main>