<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { config } from '$lib/config.js';

	let { data } = $props();

	let settings = $state({ ...data.settings });
	let saving = $state(false);
	let message = $state('');
	let bannerFile = $state(null);
	let bannerPreview = $state(data.settings?.marketplace_banner_image ? `${config.storage}/${data.settings.marketplace_banner_image}` : null);

	async function saveSettings() {
		saving = true;
		message = '';

		try {
			const formData = new FormData();
			formData.append('starting_currency', settings.starting_currency);
			formData.append('daily_bonus', settings.daily_bonus);
			formData.append('maintenance_mode', settings.maintenance_mode);
			formData.append('registration_open', settings.registration_open);
			formData.append('banner_message', settings.banner_message ?? '');
			if (bannerFile) {
				formData.append('marketplace_banner_image', bannerFile);
			}

			const response = await fetch(`${config.api}/admin/site-settings`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					Authorization: `Bearer ${data.token}`
				},
				body: formData
			});

			const json = await response.json();
			if (!response.ok) {
				message = json?.message || 'Failed to save settings';
			} else {
				message = 'Settings saved successfully!';
				if (json.data?.marketplace_banner_image) {
					bannerPreview = `${config.storage}/${json.data.marketplace_banner_image}`;
				}
				setTimeout(() => {
					message = '';
				}, 3000);
			}
		} catch (err) {
			message = 'Error saving settings';
			console.error(err);
		} finally {
			saving = false;
		}
	}

	function handleBannerUpload(e) {
		const file = e.target.files?.[0];
		if (file) {
			bannerFile = file;
			bannerPreview = URL.createObjectURL(file);
		}
	}

	let bulkAction = $state('');
	let bulkMessage = $state('');

	async function rerenderAll(kind) {
		bulkAction = kind;
		bulkMessage = '';

		try {
			const url = kind === 'users' ? 'rerender-all-users' : 'rerender-all-items';
			const response = await fetch(`${config.api}/admin/${url}`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			const json = await response.json();
			if (!response.ok) {
				bulkMessage = json?.message || 'Failed to re-render.';
			} else if (json.data?.status === 'queued') {
				bulkMessage = typeof json.data.message === 'string'
					? json.data.message
					: 'Re-render queued and running in the background.';
			} else {
				const { rendered = 0, failed = 0, skipped = 0 } = json.data || {};
				const label = kind === 'users' ? 'users' : 'items';
				let text = `Re-rendered ${rendered} ${label}.`;
				if (failed) text += ` ${failed} failed.`;
				if (skipped) text += ` ${skipped} skipped.`;
				bulkMessage = text;
			}
		} catch (err) {
			bulkMessage = 'Failed to re-render.';
			console.error(err);
		} finally {
			bulkAction = '';
		}
	}
</script>

<main class="py-6">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/admin" class="hover:text-primary">Admin Dashboard</a> вЂє
			<span class="text-gray-700">Site Settings</span>
		</div>

		<h1 class="text-xl font-bold text-gray-900 mb-5">Site Settings</h1>

		<div class="border border-[#EFE6E2] rounded-lg p-5 bg-white">
			{#if message}
				<div class="mb-4 p-4 rounded-lg text-sm {message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}">
					{message}
				</div>
			{/if}

			<div class="space-y-5">
				<div>
					<label class="block text-sm font-bold text-gray-700 mb-1">Starting Currency</label>
					<input type="number" bind:value={settings.starting_currency} min="0" class="form-input" />
					<p class="text-xs text-gray-500 mt-1">The amount of currency new users receive when they register.</p>
				</div>

				<div>
					<label class="block text-sm font-bold text-gray-700 mb-1">Daily Bonus</label>
					<input type="number" bind:value={settings.daily_bonus} min="0" class="form-input" />
					<p class="text-xs text-gray-500 mt-1">The amount of currency users can claim daily.</p>
				</div>

				<div class="flex items-center gap-4">
					<input type="checkbox" id="maintenance_mode" bind:checked={settings.maintenance_mode} class="w-4 h-4 text-[#A2574F] border-gray-300 rounded-lg" />
					<div>
						<label for="maintenance_mode" class="block text-sm font-bold text-gray-700">Maintenance Mode</label>
						<p class="text-xs text-gray-500">When enabled, the site will be inaccessible to regular users.</p>
					</div>
				</div>

				<div class="flex items-center gap-4">
					<input type="checkbox" id="registration_open" bind:checked={settings.registration_open} class="w-4 h-4 text-[#A2574F] border-gray-300 rounded-lg" />
					<div>
						<label for="registration_open" class="block text-sm font-bold text-gray-700">Registration Open</label>
						<p class="text-xs text-gray-500">Allow new users to create accounts.</p>
					</div>
				</div>

				<div>
					<label class="block text-sm font-bold text-gray-700 mb-1">Announcement Bar Message</label>
					<input type="text" bind:value={settings.banner_message} maxlength="500" placeholder="The Medieval Collection and the Arena are live! Check out our blog post!" class="form-input" />
					<p class="text-xs text-gray-500 mt-1">Shown in the announcement bar at the top of the site for logged-in users. Leave empty to hide the bar.</p>
				</div>

				<div>
					<label class="block text-sm font-bold text-gray-700 mb-1">Marketplace Banner Image</label>
					{#if bannerPreview}
						<div class="mb-2 rounded-lg overflow-hidden border border-[#EFE6E2]">
							<img src={bannerPreview} alt="Marketplace banner preview" class="w-full h-auto max-h-48 object-cover" />
						</div>
					{/if}
					<input type="file" accept="image/*" onchange={handleBannerUpload} class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold !btn-glossy file:bg-[#A2574F] file:text-white hover:file:bg-[#8E4A43] cursor-pointer" />
					<p class="text-xs text-gray-500 mt-1">Upload a banner image to display at the top of the marketplace page.</p>
				</div>

				<div class="flex gap-4 pt-3">
					<button onclick={saveSettings} disabled={saving} class="btn-glossy px-4 py-1 text-sm">
						{saving ? 'Saving...' : 'Save Changes'}
					</button>
					<button onclick={() => goto('/admin')} class="btn-secondary px-4 py-1 text-sm">Cancel</button>
				</div>
			</div>
		</div>

		{#if data.user?.role === 'admin'}
			<div class="border border-[#EFE6E2] rounded-lg p-5 bg-white mt-5">
				<h2 class="text-lg font-bold text-gray-900 mb-1">Re-render All</h2>
				<p class="text-sm text-gray-600 mb-4">Regenerate the rendered thumbnail/avatar for every item or every user. This can take a while to complete.</p>
				{#if bulkMessage}
					<div class="mb-4 p-3 rounded-lg text-sm bg-blue-50 text-blue-700 border border-blue-200">{bulkMessage}</div>
				{/if}
				<div class="flex flex-wrap gap-4">
					<button onclick={() => rerenderAll('users')} disabled={!!bulkAction} class="btn-secondary px-4 py-2 text-sm">
						{bulkAction === 'users' ? 'Rendering...' : 'Re-render All Users'}
					</button>
					<button onclick={() => rerenderAll('items')} disabled={!!bulkAction} class="btn-secondary px-4 py-2 text-sm">
						{bulkAction === 'items' ? 'Rendering...' : 'Re-render All Items'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</main>

<style>
	.card-shadow {
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
	}
	.form-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-size: 0.875rem;
		color: #111827;
		background: #fff;
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}
	.form-input:focus {
		outline: none;
		border-color: #a2574f;
		box-shadow: 0 0 0 3px rgba(162, 87, 79, 0.12);
	}
</style>