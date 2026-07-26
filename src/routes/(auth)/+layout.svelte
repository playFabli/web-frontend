<script lang="ts">
	import '../layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { SvelteKitTopLoader } from 'sveltekit-top-loader';
	import { page } from '$app/state';
	import { config } from '$lib/config.js';
	import { goto } from '$app/navigation';

	let { children, data } = $props();
	let open = $state(false);
	let frModalOpen = $state(false);
	let menu: HTMLElement;
	let profileButton: HTMLElement;
	let moreOpen = $state(false);
	let moreMenu: HTMLElement;
	let moreButton: HTMLElement;

	function toggleMenu(e: MouseEvent) {
		e.stopPropagation();
		open = !open;
	}

	function toggleMoreMenu(e: MouseEvent) {
		e.stopPropagation();
		moreOpen = !moreOpen;
	}

	function onWindowClick(e: MouseEvent) {
		// close when clicking outside the menu and the button
		if (!open && !moreOpen) return;
		const target = e.target as Node;
		if (open && !menu.contains(target) && !profileButton.contains(target)) {
			open = false;
		}
		if (moreOpen && !moreMenu.contains(target) && !moreButton.contains(target)) {
			moreOpen = false;
		}
	}

	async function getFriendRequests() {
		try {
			let response = await fetch(`${config.api}/user/friend/requests`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			const json = await response.json();
			if (!response.ok) {
				console.error(json?.message || 'Failed to fetch friend requests.');
				return [];
			}

			return json || [];
		} catch (err) {
			console.error('Failed to fetch friend requests.');
		}
	}

	let requestLoading = $state(false);
	async function changeRequestState(id, state) {
		try {
			requestLoading = true;
			let response = await fetch(`${config.api}/user/friend/change/${id}/${state}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			const json = await response.json();
			requestLoading = false;
			if (!response.ok) {
				console.error(json?.message || 'Failed to update friend request.');
				return;
			}

			friendRequestsPromise = getFriendRequests();
		} catch (err) {
			console.error('Failed to update friend request.');
		} finally {
			requestLoading = false;
		}
	}

	function logout() {
		document.cookie = `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
		goto("/user/login");
	}

	let friendRequestsPromise = $state(null);
	let mobileMenuOpen = $state(false);
</script>

<svelte:window on:click={onWindowClick} />
<svelte:head><title>{`${page.data.title ?? "Page"} - Fabli`}</title><link rel="icon" href={favicon} /></svelte:head>
<SvelteKitTopLoader color="#b5685f" />
{#if frModalOpen}
<div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 100;">
    <div class="modal" style="background: white; border: 1px solid #e5e7eb; border-radius: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08); width: 90%; max-width: 420px;">
        <div class="modal-header" style="padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between;">
            {#await friendRequestsPromise}
			<h2 class="text-base font-semibold text-gray-900">Friend Requests (Loading...)</h2>
			{:then requests}
			<h2 class="text-base font-semibold text-gray-900">Friend Requests ({requests.total})</h2>
			{/await}
			<button onclick={()=>frModalOpen = false} class="close-btn" style="background: none; border: none; font-size: 1.25rem; color: #6b7280; cursor: pointer; line-height: 1; padding: 0 0.25rem;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1rem;">
			{#await friendRequestsPromise}
			<p class="text-neutral-500 text-sm">Loading friend requests...</p>
			{:then requests}
				{#if requests.data.length == 0}
				<p class="text-neutral-500 text-sm">You do not have any friend requests yet.</p>
				{/if}
				{#each requests.data as request}
				<div class="flex items-center justify-between py-2 border-b border-gray-100 request-row">
					<div class="flex items-center gap-2">
						<img src={`${config.headshotStorage}/${request.from.id}.png?t=${Date.now()}`} alt="RareCollector" class="w-7 h-7 rounded-full border border-gray-200">
						<span class="text-sm font-medium text-gray-900">{request.from.username}</span>
					</div>
					<div class="flex gap-2">
						<button disabled={requestLoading} onclick={()=>changeRequestState(request.id, 0)} class="btn-glossy accept-btn px-2 py-1 text-xs">Accept</button>
						<button disabled={requestLoading} onclick={()=>changeRequestState(request.id, 1)} class="btn-secondary decline-btn px-2 py-1 text-xs">Decline</button>
					</div>
				</div>
				{/each}
			{/await}
        </div>
    </div>
</div>
{/if}
<div class="min-h-screen flex flex-col">
<nav class="bg-white border-b border-[#c7b3a0]/30 sticky top-0 z-50 min-h-[44px]">
	<div class="max-w-container mx-auto px-4 flex items-center justify-between min-h-[44px]">
		<div class="flex items-center gap-4 lg:gap-5">
			<a href="/user/homepage" class="inline-flex items-baseline font-bold text-gray-900 text-base tracking-tight whitespace-nowrap select-none">
				<img class="inline-block h-[32px]" src="/logo_full.png" alt="Logo"> 
				<span class="text-sm font-medium text-[#A2574F] ml-1">alpha</span>
			</a>
			
			<div class="hidden md:flex items-center gap-4 text-sm text-gray-600 font-medium">
				<a href="/explore" class="hover:text-[#A2574F] transition-colors duration-200">Explore</a>
				<a href="/marketplace" class="hover:text-[#A2574F] transition-colors duration-200">Marketplace</a>
				<a href="/forum" class="hover:text-[#A2574F] transition-colors duration-200">Forum</a>
				
				<div class="relative">
					<button
						bind:this={moreButton}
						onclick={toggleMoreMenu}
						class="cursor-pointer flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-[#A2574F] p-1 rounded transition-colors duration-200"
						aria-expanded={moreOpen}
						aria-haspopup="true"
					>
						<span>More</span>
						<svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					{#if moreOpen}
					<div bind:this={moreMenu} class="absolute left-0 mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg z-50" role="menu">
						<a href="/users" class="block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Users</a>
						<a href="/user/leaderboard" class="block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Leaderboard</a>
						<a href="/roadmap" class="block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Roadmap</a>
						<a href="/petitions" class="block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Petitions</a>
					</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="flex items-center gap-2 sm:gap-4 flex-shrink-0">
			
			<div class="flex items-center gap-3 text-sm font-medium text-gray-700">
				<span onclick={() => { friendRequestsPromise = getFriendRequests(); frModalOpen = true; }} class="inline-flex items-center cursor-pointer hover:text-[#A2574F] transition-colors duration-200" title="Friend Requests">
					<span class="text-[#A2574F]">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg>
					</span>
					<span class="hidden sm:inline ml-1">Friend Requests</span>
				</span>

				<a href="/user/upgrade" class="inline-flex items-center gap-1" title="Coins">
					<span class="text-[#A2574F]">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" /><path d="M15 6h1v4" /><path d="m6.134 14.768.866-.5 2 3.464" /><circle cx="16" cy="8" r="6" /></svg>
					</span>
					<span>{data.user.coins}</span>
				</a>
			</div>

			<div class="relative">
				<button
					bind:this={profileButton}
					onclick={toggleMenu}
					class="cursor-pointer flex items-center gap-1 sm:gap-2 text-sm font-medium text-gray-600 hover:text-[#A2574F] p-1 rounded transition-colors duration-200"
					aria-expanded={open}
					aria-haspopup="true"
				>
					<img src={config.headshotStorage + "/" + data.globalUser.id + ".png"} alt="Avatar" class="w-8 h-8 rounded-full" />
					<span class="hidden xs:inline">{data.user.username}</span>
					<svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				{#if open}
				<div bind:this={menu} class="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded shadow-lg z-50" role="menu">
					<a href={`/user/profile/${data.user.id}`} class="block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Profile</a>
					<a href='/user/avatar' class="w-full text-left block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Avatar</a>
					<a href='/user/trades' class="w-full text-left block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Trades</a>
					<a href='/user/inventory/my' class="w-full text-left block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Inventory</a>
					<a href='/user/settings' class="w-full text-left block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Settings</a>
					{#if data.globalUser.role != "user"}
					<a href='/admin' class="w-full text-left block px-3 py-1.5 text-sm text-red-500 hover:bg-red-50">Admin</a>
					{/if}
					<hr class="border-gray-200" />
					<button onclick={logout} class="cursor-pointer w-full text-left block px-3 py-1.5 text-sm text-red-600 hover:bg-gray-50">Logout</button>
				</div>
				{/if}
			</div>

			<button 
				onclick={() => mobileMenuOpen = !mobileMenuOpen}
				class="p-1 text-gray-600 hover:text-[#A2574F] md:hidden focus:outline-none"
				aria-label="Toggle menu"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
		</div>
	</div>

	{#if mobileMenuOpen}
	<div class="md:hidden border-t border-gray-100 bg-white px-4 py-2 flex flex-col gap-2 text-sm text-gray-600 font-medium fallback-menu">
		<a href="/explore" class="py-1.5 hover:text-[#A2574F] transition-colors duration-200">Explore</a>
		<a href="/marketplace" class="py-1.5 hover:text-[#A2574F] transition-colors duration-200">Marketplace</a>
		<a href="/forum" class="py-1.5 hover:text-[#A2574F] transition-colors duration-200">Forum</a>
		<a href="/users" class="py-1.5 hover:text-[#A2574F] transition-colors duration-200">Users</a>
		<a href="/user/leaderboard" class="py-1.5 hover:text-[#A2574F] transition-colors duration-200">Leaderboard</a>
		<a href="/roadmap" class="py-1.5 hover:text-[#A2574F] transition-colors duration-200">Roadmap</a>
		<a href="/petitions" class="py-1.5 hover:text-[#A2574F] transition-colors duration-200">Petitions</a>
	</div>
	{/if}
</nav>



	<main class="flex-1">
		{#if !data.user?.is_email_verified}
		<div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
			<div class="bg-white border border-gray-200 rounded shadow-xl max-w-md w-full mx-4">
				<div class="p-6 text-center">
					<div class="text-4xl mb-3">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-10 mb-1 inline"><path d="M22 12.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h7.5"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><path d="M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><circle cx="18" cy="18" r="3"/><path d="m22 22-1.5-1.5"/></svg>
					</div>
					<h2 class="text-lg font-semibold text-gray-900 mb-2">Verify Your Email</h2>
					<p class="text-sm text-gray-700 mb-4">
						Please check your inbox and verify your email address to continue using the site.
					</p>
				</div>
			</div>
		</div>
		{/if}
		{@render children()}
	</main>

	<footer class="bg-[#A2574F] border-t-1 border-[#c7b3a0]/50 pt-8 pb-6 mt-12">
		<div class="max-w-container mx-auto px-4">
			<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-[#c7b3a0]/10">
				<div class="flex items-center gap-3">
					<a href="/user/homepage" class="font-bold text-neutral-100 text-base tracking-tight select-none">
						fabli <span class="text-sm">alpha</span>
					</a>
					<span class="text-neutral-300 text-sm">© 2026</span>
				</div>
				<div class="flex items-center gap-x-6 gap-y-2 flex-wrap text-sm text-neutral-200 font-medium">
					<a href="#" class="hover:text-white transition-colors duration-200">About</a>
					<a href="#" class="hover:text-white transition-colors duration-200">Blog</a>
					<a href="/legal/privacy" class="hover:text-white transition-colors duration-200">Privacy</a>
					<a href="/legal/terms-of-service" class="hover:text-white transition-colors duration-200">Terms of Service</a>
				</div>
			</div>

			<div class="mt-3 space-y-1 max-w-3xl">
				<p class="text-neutral-300/40 text-xs leading-relaxed">
					* All in-game currency is strictly virtual, holds no real-world monetary value, and cannot be exchanged for fiat currency.
				</p>
				<p class="text-neutral-300/40 text-xs leading-relaxed">
					* This platform is an independent project and is not affiliated with, authorized, endorsed, or sponsored by ROBLOX Corporation.
				</p>
			</div>
		</div>
	</footer>

</div>
