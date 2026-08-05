<script>
	import { invalidate } from '$app/navigation';
	import { config } from '$lib/config';

	let { data } = $props();
	let user = $derived(data.user);

	// Main settings
	let username = $state('');
	let email = $state(user.email);
	let description = $state(user.description)
	let password = $state('');
	let curPassword = $state('');

	let settingsError = $state('');
	let success = $state('');
	
	let descLoading = $state(false);
	async function updateDescription() {
		try {
			success = '';
			descLoading = true;
			let response = await fetch(`${config.api}/user/settings/description`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				},
				body: JSON.stringify({
					description: description
				})
			});

			const json = await response.json();
			descLoading = false;
			if (!response.ok) {
				settingsError = json?.message || 'Failed to update description.';
				return;
			}

			settingsError = '';
			success = 'Description updated!'
			await invalidate('app:layout-data');
		} catch (err) {
			descLoading = false;
			settingsError = 'Failed to update description.';
		} finally {
			descLoading = false;
		}
	}

	let emailLoading = $state(false);
	async function changeEmail() {
		try {
			success = '';
			emailLoading = true;
			let response = await fetch(`${config.api}/user/settings/email`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				},
				body: JSON.stringify({
					email: email
				})
			});

			const json = await response.json();
			emailLoading = false;
			if (!response.ok) {
				settingsError = json?.message || 'Failed to update email.';
				return;
			}

			settingsError = '';
			success = 'Email updated!'
			await invalidate('app:layout-data');
		} catch (err) {
			emailLoading = false;
			settingsError = 'Failed to update email.';
		} finally {
			emailLoading = false;
		}
	}

	let passwordLoading = $state(false);
	async function changePassword() {
		try {
			success = '';
			passwordLoading = true;
			let response = await fetch(`${config.api}/user/settings/password`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				},
				body: JSON.stringify({
					password: password,
					current_password: curPassword
				})
			});

			const json = await response.json();
			passwordLoading = false;
			if (!response.ok) {
				settingsError = json?.message || 'Failed to update password.';
				return;
			}

			settingsError = '';
			success = 'Password updated!'
			await invalidate('app:layout-data');
		} catch (err) {
			passwordLoading = false;
			settingsError = 'Failed to update password.';
		} finally {
			passwordLoading = false;
		}
	}

	let usernameLoading = $state(false);
	async function changeUsername() {
		try {
			success = '';
			usernameLoading = true;
			let response = await fetch(`${config.api}/user/settings/username`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				},
				body: JSON.stringify({
					username: username
				})
			});

			const json = await response.json();
			usernameLoading = false;
			if (!response.ok) {
				settingsError = json?.message || 'Failed to update username.';
				return;
			}

			settingsError = '';
			success = 'Username updated!'
			await invalidate('app:layout-data');
		} catch (err) {
			usernameLoading = false;
			settingsError = 'Failed to update username.';
		} finally {
			usernameLoading = false;
		}
	}

	// Privacy settings
	let profileVisible = $state(user.privacy.profile_visible);
	let showLastOnlineTime = $state(user.privacy.show_last_online_time);
	let showRAP = $state(user.privacy.show_rap);
	let whoCanPostOnWall = $state(user.privacy.who_can_post_on_wall);
	let whoCanSeeInventory = $state(user.privacy.who_can_see_inventory);
	let whoCanTrade = $state(user.privacy.who_can_trade);

	let privacyLoading = $state(false);

	async function updatePrivacy() {
		try {
			success = '';
			privacyLoading = true;
			let response = await fetch(`${config.api}/user/settings/privacy`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				},
				body: JSON.stringify({
					profile_visible: profileVisible,
					show_last_online_time: showLastOnlineTime,
					show_rap: showRAP,
					who_can_post_on_wall: whoCanPostOnWall,
					who_can_see_inventory: whoCanSeeInventory,
					who_can_trade: whoCanTrade
				})
			});

			const json = await response.json();
			privacyLoading = false;
			if (!response.ok) {
				settingsError = json?.message || 'Failed to update privacy settings.';
				return;
			}

			settingsError = '';
			success = 'Privacy settings updated!'
			await invalidate('app:layout-data');
		} catch (err) {
			privacyLoading = false;
			settingsError = 'Failed to update privacy settings.';
		} finally {
			privacyLoading = false;
		}
	}
</script>

<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		<h1 class="text-xl font-bold text-gray-900 mb-5">Account Settings</h1>
		{#if settingsError}
			<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
				{settingsError}
			</div>
		{/if}
		{#if success}
			<div class="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
				{success}
			</div>
		{/if}
		<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
			<div class="md:col-span-2 space-y-2">
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
					<h2 class="text-lg font-bold mb-3">Profile</h2>
					<div class="mb-3">
						<label class="form-label" for="description">Profile Description</label>
						<textarea
							id="description"
							class="form-input"
							rows="3"
							placeholder="Tell others about yourself..." bind:value={description}></textarea
						>
					</div>
					<button onclick={updateDescription} disabled={descLoading} class="btn-glossy px-4 py-1 text-sm">
						{#if descLoading}
							Saving...
						{:else}
							Save Description
						{/if}
					</button>
				</div>

				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
					<h2 class="text-lg font-bold mb-3">Account</h2>
					<div class="mb-3">
						<label class="form-label" for="email">Email</label>
						<input type="email" id="email" class="form-input" bind:value={email} />
					</div>
					<button onclick={changeEmail} disabled={emailLoading} class="btn-glossy px-4 py-1 text-sm">
						{#if emailLoading}
							Updating...
						{:else}
							Update Email
						{/if}
					</button>
				</div>

				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
					<h2 class="text-lg font-bold mb-3">Password</h2>
					<div class="mb-3">
						<label class="form-label" for="current-password">Current Password</label>
						<input
							type="password"
							id="current-password"
							bind:value={curPassword}
							class="form-input"
							placeholder="Enter current password"
						/>
					</div>
					<div class="mb-3">
						<label class="form-label" for="new-password">New Password</label>
						<input
							type="password"
							id="new-password"
							bind:value={password}
							class="form-input"
							placeholder="Leave blank to keep current"
						/>
					</div>
					<button onclick={changePassword} disabled={passwordLoading} class="btn-glossy px-4 py-1 text-sm">
						{#if passwordLoading}
							Updating...
						{:else}
							Update Password
						{/if}
					</button>
				</div>

				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
					<h2 class="text-lg font-bold mb-3">Change Username</h2>
					<p class="text-xs text-gray-600 mb-2">
						Changing your username costs <span class="font-bold text-primary"
							>500 <svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="size-4 inline mb-1 !text-primary"
								><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" /><path d="M15 6h1v4" /><path
									d="m6.134 14.768.866-.5 2 3.464"
								/><circle cx="16" cy="8" r="6" /></svg
							></span
						>. You have
						<span class="font-bold"
							>{user.coins}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="size-4 inline mb-1 !text-primary"
								><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" /><path d="M15 6h1v4" /><path
									d="m6.134 14.768.866-.5 2 3.464"
								/><circle cx="16" cy="8" r="6" /></svg
							></span
						>.
					</p>
					<div class="flex gap-2">
						<input bind:value={username} type="text" class="form-input" placeholder="New username"/>
						<button
							disabled={user.coins < 500 || usernameLoading}
							onclick={changeUsername}
							class="btn-glossy px-4 py-2 text-sm whitespace-nowrap">
							{#if usernameLoading}
								Changing...
							{:else}
								Change
							{/if}
							</button
						>
					</div>
				</div>
			</div>

			<div class="md:col-span-1">
				<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
					<h2 class="text-lg font-bold mb-3">Privacy</h2>
					<div class="setting-group">
						<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none group">
						<div class="relative flex items-center justify-center">
							<input 
							bind:checked={profileVisible}
							type="checkbox" 
							class="peer appearance-none w-4 h-4 rounded-lg-xs cursor-pointer border border-gray-300 bg-white checked:bg-primary checked:border-primary transition-all duration-150" 
							/>
						
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="absolute w-3 h-3 text-white pointer-events-none opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-150 ease-out"><path d="M20 6 9 17l-5-5"/></svg>
						</div>
						
						<span class="group-hover:text-gray-900 transition-colors duration-150">
							Profile visible to everyone
						</span>
						</label>
						<p class="text-xs text-gray-500 ml-6">If off, only friends can see your profile.</p>
					</div>
					<div class="setting-group">
						<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none group">
						<div class="relative flex items-center justify-center">
							<input 
							bind:checked={showLastOnlineTime}
							type="checkbox" 
							class="peer appearance-none w-4 h-4 rounded-lg-xs cursor-pointer border border-gray-300 bg-white checked:bg-primary checked:border-primary transition-all duration-150" 
							/>
						
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="absolute w-3 h-3 text-white pointer-events-none opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-150 ease-out"><path d="M20 6 9 17l-5-5"/></svg>
						</div>
						
						<span class="group-hover:text-gray-900 transition-colors duration-150">
							Show last online time
						</span>
						</label>
					</div>
					<div class="setting-group">
						<label for="who-post" class="form-label text-xs font-bold mb-1">Who can post on your wall</label>
						<select id="who-post" bind:value={whoCanPostOnWall} class="form-input text-sm">
							<option value={0}>Everyone</option>
							<option value={1}>Friends</option>
							<option value={2}>No one</option>
						</select>
					</div>
					<div class="setting-group">
						<label for="who-inventory" class="form-label text-xs font-bold mb-1">Who can see your inventory</label>
						<select id="who-inventory" bind:value={whoCanSeeInventory} class="form-input text-sm">
							<option value={0}>Everyone</option>
							<option value={1}>Friends</option>
							<option value={2}>No one</option>
						</select>
					</div>
					<div class="setting-group">
						<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none group">
						<div class="relative flex items-center justify-center">
							<input 
							bind:checked={showRAP}
							type="checkbox" 
							class="peer appearance-none w-4 h-4 rounded-lg-xs cursor-pointer border border-gray-300 bg-white checked:bg-primary checked:border-primary transition-all duration-150" 
							/>
						
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="absolute w-3 h-3 text-white pointer-events-none opacity-0 scale-50 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-150 ease-out"><path d="M20 6 9 17l-5-5"/></svg>
						</div>
						
						<span class="group-hover:text-gray-900 transition-colors duration-150">
							Show VAL on profile
						</span>
						</label>
					</div>
					<div class="setting-group">
						<label for="who-trade" class="form-label text-xs font-bold mb-1">Who can send trade requests</label>
						<select id="who-trade" bind:value={whoCanTrade} class="form-input text-sm">
							<option value={0}>Everyone</option>
							<option value={1}>Friends</option>
							<option value={2}>No one</option>
						</select>
					</div>
					<button disabled={privacyLoading} onclick={updatePrivacy} class="btn-secondary w-full mt-3 py-2 text-sm">
						{#if privacyLoading}
							Saving...
						{:else}
							Save Privacy Settings
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
</main>

<style>
	.setting-group {
		border-bottom: 1px solid #f3f4f6;
		padding: 0.75rem 0;
	}
	.setting-group:last-child {
		border-bottom: none;
	}
</style>
