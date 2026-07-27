<script>
	import { invalidateAll } from '$app/navigation';
	import { config } from '$lib/config.js';
	import { timeSince } from '$lib/timeAgo';

	let { data } = $props();

	let content = $state('');
	let error = $state('');
	let loading = $state(false);
	let buyModalOpen = $state(false);
	let comments = $state(data.item.comments);
	let tabActive = $state(1);

	async function fetchComments() {
		let response = await fetch(`${config.api}/marketplace/comments/${data.item.id}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${data.token}`
			}
		});

		const json = await response.json();
		if (!response.ok) {
			console.error(json?.message || 'Failed to fetch comments.');
			return [];
		}

		return json || [];
	}

	async function comment() {
		loading = true;

		try {
			let response = await fetch(`${config.api}/marketplace/comments/${data.item.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				},
				body: JSON.stringify({ content })
			});

			const json = await response.json();
			loading = false;

			if (!response.ok) {
				error = json?.message || 'Failed to post comment.';
				return;
			}

			if (response.status === 201) {
				content = '';
				comments = await fetchComments();
			}
		} catch (err) {
			loading = false;
			error = 'Failed to post comment.';
		} finally {
			loading = false;
		}
	}

	let buyError = $state();
	let buyLoading = $state(false);
	async function buy() {
		buyLoading = true;
		buyError = '';
		try {
			let response = await fetch(`${config.api}/marketplace/buy/${data.item.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			const json = await response.json();
			if (!response.ok) {
				buyLoading = false;
				buyError = json?.message || 'Failed to buy item.';
				return;
			}

			buyModalOpen = false;
			await invalidateAll();
		} catch (err) {
			console.error('Failed to buy item.');
		} finally {
			buyLoading = false;
		}
	}

	async function getContents() {
		try {
			let response = await fetch(`${config.api}/marketplace/case-contents/${data.item.id}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			const json = await response.json();
			if (!response.ok) {
				console.error(json?.message || 'Failed to fetch contents.');
				return [];
			}

			return json || [];
		} catch (err) {
			console.error('Failed to fetch contents.');
		}
	}

	let caseContentsPromise = $state(null);
	if (data.item.category.title === 'Boxes') {
		tabActive = 0;
		caseContentsPromise = getContents();
	}

	async function fetchOwners(page = 1) {
		try {
			let response = await fetch(`${config.api}/marketplace/owners/${data.item.id}?page=${page}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			const json = await response.json();
			if (!response.ok) {
				console.error(json?.message || 'Failed to fetch owners.');
				return [];
			}

			return json || [];
		} catch (err) {
			console.error('Failed to fetch owners.');
		}
	}

	async function fetchSellers(page = 1) {
		try {
			let response = await fetch(`${config.api}/marketplace/sell-requests/${data.item.id}?page=1`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			const json = await response.json();
			if (!response.ok) {
				console.error(json?.message || 'Failed to fetch sellers.');
				return [];
			}

			return json || [];
		} catch (err) {
			console.error('Failed to fetch sellers.');
		}
	}

	let ownersPromise = $state(null);
	let sellersPromise = $state(null);
	let saleModalOpen = $state(false);
	if (data.item.is_limited) {
		ownersPromise = fetchOwners(1);
		sellersPromise = fetchSellers();
	}

	let saleLoading = $state(false);
	let salePrice = $state(0);
	let saleId = $state(0);
	let saleError = $state();

	async function sell() {
		saleLoading = true;
		try {
			let response = await fetch(`${config.api}/marketplace/sell-request/${data.item.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				},
				body: JSON.stringify({ price: salePrice })
			});

			const json = await response.json();
			if (!response.ok) {
				saleLoading = false;
				saleError = json?.message || 'Failed to sell item.';
				return;
			}

			saleModalOpen = false;
			sellersPromise = fetchSellers();
		} catch (err) {
			console.error('Failed to sell item.');
		} finally {
			saleLoading = false;
		}
	}

	const formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	});

	let privateBuyObj = $state({});
	let privateBuyModalOpen = $state(false);
	let privateBuyLoading = $state(false);
	let privateBuyError = $state();
	async function buyFromPrivate() {
		privateBuyLoading = true;
		try {
			let response = await fetch(`${config.api}/marketplace/accept-sell-request/${privateBuyObj.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				},
			});

			const json = await response.json();
			if (!response.ok) {
				privateBuyError = json?.message || 'Failed to buy from seller.';
				privateBuyLoading = false;
				return;
			}

			privateBuyModalOpen = false;
			sellersPromise = fetchSellers();
			ownersPromise = fetchOwners();
		} catch (err) {
			console.error('Failed to buy from private.');
		} finally {
			privateBuyLoading = false;
		}
	}

	let deleteLoading = $state(false);
	let deleteError = $state('');
	async function deleteSellRequest(sellRequestId) {
		deleteLoading = true;
		deleteError = '';
		try {
			let response = await fetch(`${config.api}/marketplace/sell-request/${sellRequestId}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			const json = await response.json();
			if (!response.ok) {
				deleteError = json?.message || 'Failed to delete sell request.';
				deleteLoading = false;
				return;
			}

			sellersPromise = fetchSellers();
		} catch (err) {
			console.error('Failed to delete sell request.');
		} finally {
			deleteLoading = false;
		}
	}

	let user = $derived(data.user);

	async function deleteComment(commentId) {
		if (!confirm('Are you sure you want to delete this comment?')) return;

		try {
			const res = await fetch(`${config.api}/marketplace/comment/${commentId}`, {
				method: 'DELETE',
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});

			if (!res.ok) {
				const json = await res.json();
				console.error(json?.message || 'Failed to delete comment.');
				return;
			}

			comments = await fetchComments();
		} catch (err) {
			console.error('Failed to delete comment.', err);
		}
	}
</script>

{#if buyModalOpen}
	<div id="modalOverlay" class="modal-overlay">
		<div class="modal">
			<div class="modal-header">
				<h2 class="text-base font-semibold text-gray-900">
					Buy "{data.item.title}" for
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
						class="size-5 inline mb-1 text-primary"
						><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" /><path d="M15 6h1v4" /><path
							d="m6.134 14.768.866-.5 2 3.464"
						/><circle cx="16" cy="8" r="6" /></svg
					> <span class="text-primary">{formatter.format(data.item.price)}</span>
				</h2>
				<button onclick={() => (buyModalOpen = false)} class="close-btn">&times;</button>
			</div>
			<div class="modal-body">
				{#if buyError}
					<div class="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
						{buyError}
					</div>
				{/if}
				<p>
					Are you sure you want to buy <strong>{data.item.title}</strong> for
					<strong class="text-primary"
						><svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="size-5 inline mb-1 text-primary"
							><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" /><path d="M15 6h1v4" /><path
								d="m6.134 14.768.866-.5 2 3.464"
							/><circle cx="16" cy="8" r="6" /></svg
						>
						{formatter.format(data.item.price)}</strong
					>?
				</p>
			</div>
			<div class="modal-footer">
				<button onclick={() => (buyModalOpen = false)} class="btn-secondary px-4 py-1.5 text-sm"
					>Cancel</button
				>
				<button disabled={buyLoading} onclick={buy} class="btn-glossy px-4 py-1.5 text-sm">
					{#if buyLoading}
						Buying...
					{:else}
						Confirm
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
{#if saleModalOpen}
	<div id="modalOverlay" class="modal-overlay">
		<div class="modal">
			<div class="modal-header">
				<h2 class="text-base font-semibold text-gray-900">
					Put up a serial of "{data.item.title}" for sale
				</h2>
				<button onclick={() => (saleModalOpen = false)} class="close-btn">&times;</button>
			</div>
			<div class="modal-body">
				{#if saleError}
					<div class="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
						{saleError}
					</div>
				{/if}
				<p>
					Which serial do you want to put on sale?
				</p>
				<select bind:value={saleId} class="form-input mb-3">
					{#each data.ownerData as inv}
						<option value={inv.id}>#{inv.serial}</option>
					{/each}
				</select>
				<p>For what price?</p>
				<input bind:value={salePrice} type="number" class="form-input" placeholder="Price">
			</div>
			<div class="modal-footer">
				<button onclick={() => (saleModalOpen = false)} class="btn-secondary px-4 py-1.5 text-sm"
					>Cancel</button
				>
				<button onclick={sell} class="btn-glossy px-4 py-1.5 text-sm">
					{#if saleLoading}
						Creating...
					{:else}
						Confirm
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
{#if privateBuyModalOpen}
	<div id="modalOverlay" class="modal-overlay">
		<div class="modal">
			<div class="modal-header">
				<h2 class="text-base font-semibold text-gray-900">
					Buy #{formatter.format(privateBuyObj.inventory.serial)} of "{data.item.title}" for
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
						class="size-5 inline mb-1 text-primary"
						><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" /><path d="M15 6h1v4" /><path
							d="m6.134 14.768.866-.5 2 3.464"
						/><circle cx="16" cy="8" r="6" /></svg
					> <span class="text-primary">{formatter.format(privateBuyObj.price)}</span>
				</h2>
				<button onclick={() => (privateBuyModalOpen = false)} class="close-btn">&times;</button>
			</div>
			<div class="modal-body">
				{#if privateBuyError}
					<div class="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
						{privateBuyError}
					</div>
				{/if}
				<p>
					Are you sure you want to buy #{formatter.format(privateBuyObj.inventory.serial)} of <strong>{data.item.title}</strong> for
					<strong class="text-primary"
						><svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="size-5 inline mb-1 text-primary"
							><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" /><path d="M15 6h1v4" /><path
								d="m6.134 14.768.866-.5 2 3.464"
							/><circle cx="16" cy="8" r="6" /></svg
						>
						{formatter.format(privateBuyObj.price)}</strong
					>?
				</p>
			</div>
			<div class="modal-footer">
				<button onclick={() => (privateBuyModalOpen = false)} class="btn-secondary px-4 py-1.5 text-sm"
					>Cancel</button
				>
				<button disabled={privateBuyLoading} onclick={buyFromPrivate} class="btn-glossy px-4 py-1.5 text-sm">
					{#if privateBuyLoading}
						Buying...
					{:else}
						Confirm
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
<main class="py-6">
	<div class="max-w-container mx-auto px-4">
		<div class="text-xs text-gray-500 mb-3">
			<a href="/marketplace" class="hover:text-primary">Marketplace</a> ›
			<span class="text-gray-700">{data.item.title}</span>
		</div>

		{#if data.item.moderation_status === 'pending'}
			<div class="max-w-md mx-auto text-center py-12">
				<div class="border border-yellow-200 bg-yellow-50 rounded p-6">
					<h2 class="text-lg font-semibold text-yellow-800 mb-2">Pending Approval</h2>
					<p class="text-sm text-yellow-700">This item is currently pending review by our moderation team. It will be visible once approved.</p>
				</div>
			</div>
		{:else if data.item.moderation_status === 'unapproved'}
			<div class="max-w-md mx-auto text-center py-12">
				<div class="border border-red-200 bg-red-50 rounded p-6">
					<h2 class="text-lg font-semibold text-red-800 mb-2">Denied</h2>
					<p class="text-sm text-red-700">This item has been denied by our moderation team and is not available.</p>
				</div>
			</div>
		{:else}

		<div class="item-detail-container">
			<div class="flex-shrink-0">
				<div class="border border-gray-200 rounded p-2 bg-gray-50/30 inline-block">
				{#if data.item.moderation_status == "approved"}
					<img
						src={`${config.storage}/items/${data.item.id}.png`}
						alt="render"
						class="w-48 h-48 sm:w-64 sm:h-64 object-contain"
						loading="lazy"
					/>
				{/if}
				</div>
			</div>

			<div class="flex-1">
				<div class="flex items-center gap-2 mb-1">
					<h1 class="text-xl font-bold text-gray-900">{data.item.title}</h1>
					{#if data.item.rarity != 'none'}
						<span class="rarity-badge rarity-{data.item.rarity.toLowerCase()}"
							>{data.item.rarity}</span
						>
					{/if}
					{#if data.item.is_limited && data.item.stock_left > 0}
						&nbsp;
						<div class="limited-banner !relative">
							LIMITED <span class="stock-text"
								>{data.item.stock_left} / {data.item.stock_count}</span
							>
						</div>
					{/if}
				</div>
				<p class="text-2xl font-semibold text-primary mb-3">
					{#if data.item.is_limited && data.item.stock_left == 0}
						<span class="text-primary font-bold">VAL</span> {formatter.format(data.item.final_rap)}
					{:else}
						{#if !data.item.is_offsale}
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
								class="size-5 inline mb-1 mr-1"
								><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" /><path d="M15 6h1v4" /><path
									d="m6.134 14.768.866-.5 2 3.464"
								/><circle cx="16" cy="8" r="6" /></svg
							>
							{formatter.format(data.item.price)}
						{:else}
							<p class="text-gray-600">Offsale</p>
						{/if}
					{/if}
				</p>

				<div class="mb-3">
					<p class="text-sm text-gray-700 leading-relaxed">
						{data.item.description}
					</p>
				</div>

				<div class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 mb-4">
					<div>
						<span class="font-medium">Type:</span>
						{data.item.category.title}
					</div>
					<div>
						<span class="font-medium">Creator:</span>
						<a href={`/user/profile/${data.item.user.id}`} class="text-primary hover:underline">{data.item.user.username}</a>
					</div>
					<div>
						<span class="font-medium">Listed:</span>
						{timeSince(new Date(data.item.created_at))} ago
					</div>
					<div>
						<span class="font-medium">Sales:</span>
						{data.item.sold_count}
					</div>
					{#if data.item.collections && data.item.collections.length > 0}
						<div>
							<span class="font-medium">Collection:</span>
							{#each data.item.collections as collection, i}
								<span class="text-primary">{collection.name}{i < data.item.collections.length - 1 ? ', ' : ''}</span>
							{/each}
						</div>
					{/if}
				</div>

				<div class="flex flex-wrap gap-2 mt-2">
					{#if !data.item.is_offsale}
						<button
							onclick={() => (buyModalOpen = true)}
							disabled={data.owns || (data.item.is_limited && data.item.stock_left == 0)}
							class="btn-glossy px-4 py-1 text-sm"
						>
							{#if data.item.is_limited && data.item.stock_left == 0}
								Sold Out
							{:else}
								Buy Now
							{/if}
						</button>
					{/if}
					{#if user && data.item.user && user.id === data.item.user.id}
						<a href="/marketplace/item/{data.item.id}/edit" class="btn-secondary px-4 py-1 text-sm">Edit</a>
					{/if}
					<button
						class="btn-secondary px-4 py-1 text-sm text-red-600 border-red-300 hover:bg-red-50"
						>Report</button
					>
				</div>
			</div>
		</div>
		{#if data.item.category.title == 'Boxes' || data.item.is_limited}
		<div class="mt-5 border border-gray-200 rounded">
			<div class="flex border-b border-gray-200">
				{#if data.item.category.title == 'Boxes'}
					<button
						onclick={() => (tabActive = 0)}
						class="btn-secondary px-4 py-2 !text-sm !rounded-none !border-0"
						class:active={tabActive === 0}>Contents</button
					>
				{/if}
				{#if data.item.is_limited && data.item.stock_left <= 0}
					<button
						onclick={() => (tabActive = 1)}
						class="btn-secondary active-tab px-4 py-2 !text-sm rounded-none !border-0 !border-r !border-gray-200"
						>Owners ({data.item.sold_count})</button
					>
					{#await sellersPromise}
					<button
						onclick={() => (tabActive = 2)}
						class="btn-secondary px-4 py-2 !text-sm !rounded-none !border-0">Sellers (...)</button
					>
					{:then sellers}
					<button
						onclick={() => (tabActive = 2)}
						class="btn-secondary px-4 py-2 !text-sm !rounded-none !border-0">Sellers ({sellers.total})</button
					>
					{/await}
					{#if data.owns}
					<button
						onclick={() => (saleModalOpen = true)}
						class="btn-secondary px-4 py-2 !text-sm !rounded-none !border-0">Put up for sale</button
					>
					{/if}
				{/if}
			</div>
			{#if data.item.category.title == 'Boxes'}
				<div
					id="tabContents"
					class="tab-content p-4"
					class:active={tabActive === 0}
					class:hidden={tabActive !== 0}
				>
					<p class="text-xs text-gray-600 mb-3">
						This box can drop any of the following items. Total chance sums to 100%.
					</p>
					<div class="space-y-0">
						{#await caseContentsPromise}
							<p class="text-sm text-gray-600">Loading box contents...</p>
						{:then caseContents}
							{#each caseContents.data as caseContent}
								<div class="flex items-center justify-between py-2 border-b border-gray-100">
									<div class="flex items-center gap-2">
										<img
											src={`${config.storage}/items/${caseContent.item.id}.png`}
											alt="Retro Cap"
											class="w-7 h-7 rounded border border-gray-200"
										/>
										<span class="text-sm font-medium text-gray-900">{caseContent.item.title}</span>
									</div>
									<span class="text-sm font-semibold text-primary">{caseContent.chance * 100}%</span
									>
								</div>
							{/each}
						{/await}
					</div>
				</div>
			{/if}
			{#if data.item.is_limited && data.item.stock_left <= 0}
				<div class="tab-content p-4" class:active={tabActive === 1} class:hidden={tabActive !== 1}>
					<ul class="owner-list">
						{#await ownersPromise}
							<p class="text-sm text-gray-600">Loading owners...</p>
						{:then owners}
							{#each owners.data as owner}
								<li class="flex justify-between border-b border-gray-100 py-2">
									<span
										><a href={`/user/profile/${owner.user.id}`} class="text-primary hover:underline"
											>{owner.user.username} (#{owner.serial})</a
										></span
									>
									<span class="text-xs text-gray-500"
										>Owned for {timeSince(new Date(owner.created_at))}</span
									>
								</li>
							{/each}
						{/await}
					</ul>
					<div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						{#await ownersPromise}
							<div class="flex items-center gap-2">
								<button
									class="opacity-50 cursor-not-allowed inline-flex items-center justify-center rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
									disabled>Prev</button
								>
								<button
									class="opacity-50 cursor-not-allowed inline-flex items-center justify-center rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
									>Next</button
								>
							</div>
							<p class="text-xs text-gray-400">Showing .. of ... owners</p>
						{:then owners}
							<div class="flex items-center gap-2">
								{#if owners.prev_page_url === null}
									<button
										class="opacity-50 cursor-not-allowed inline-flex items-center justify-center rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
										disabled>Prev</button
									>
								{:else}
									<button
										onclick={() => (ownersPromise = fetchOwners(owners.current_page - 1))}
										class="inline-flex items-center justify-center rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
										>Prev</button
									>
								{/if}
								{#if owners.next_page_url === null}
									<button
										class="opacity-50 cursor-not-allowed inline-flex items-center justify-center rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
										disabled>Next</button
									>
								{:else}
									<button
										onclick={() => (ownersPromise = fetchOwners(owners.current_page + 1))}
										class="inline-flex items-center justify-center rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
										>Next</button
									>
								{/if}
							</div>
							<p class="text-xs text-gray-400">
								Showing {(owners.current_page - 1) * 5 + 1}–{Math.min(
									owners.current_page * 5,
									owners.total
								)} of {owners.total} owners
							</p>
						{/await}
					</div>
				</div>
				<div
					id="tabSellers"
					class="tab-content p-4"
					class:active={tabActive === 2}
					class:hidden={tabActive !== 2}
				>
					<p class="text-xs text-gray-500 mb-3">
						These users are currently selling "{data.item.title}". Prices are set individually.
					</p>
					<div class="space-y-0">
						{#await sellersPromise then sellers}
							{#if sellers.total == 0}
								<p class="text-sm text-gray-600 mb-3">No sellers found.</p>
							{/if}
							{#each sellers.data as seller}
								<div class="seller-row">
									<div>
										<a href={`/user/profile/${seller.user.id}`} class="text-sm font-medium text-gray-900"
											>{seller.user.username} (#{seller.inventory.serial})</a
										>
									</div>
								<div class="flex items-center gap-3">
									<span class="text-sm font-semibold text-primary"
										><svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="3"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="size-5 inline mb-1 text-primary"
											><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" /><path d="M15 6h1v4" /><path
												d="m6.134 14.768.866-.5 2 3.464"
											/><circle cx="16" cy="8" r="6" /></svg
										>
										{formatter.format(seller.price)}</span
									>
									{#if seller.user.id === user.id}
										<button disabled={deleteLoading} onclick={() => deleteSellRequest(seller.id)} class="btn-secondary px-3 py-1 text-xs text-red-600 border-red-300 hover:bg-red-50">Delete</button>
									{:else}
										<button disabled={seller.user.id == user.id} onclick={()=> { privateBuyModalOpen = true; privateBuyObj = seller }} class="btn-glossy px-3 py-1 text-xs">Buy</button>
									{/if}
								</div>
								</div>
							{/each}
						{/await}
					</div>
					<div class="flex items-center gap-2">
						{#await sellersPromise}
						<button
							class="opacity-50 cursor-not-allowed inline-flex items-center justify-center rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
							disabled>Prev</button
						>
						<button
							class="opacity-50 cursor-not-allowed inline-flex items-center justify-center rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
							>Next</button
						>
						{:then sellers}
						{#if sellers.prev_page_url === null}
						<button
							class="opacity-50 cursor-not-allowed inline-flex items-center justify-center rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
							disabled>Prev</button
						>
						{:else}
						<button
							onclick={() => (sellersPromise = fetchSellers(sellers.current_page - 1))}
							class="inline-flex items-center justify-center rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
							>Prev</button
						>
						{/if}
						{#if sellers.next_page_url === null}
						<button
							class="opacity-50 cursor-not-allowed inline-flex items-center justify-center rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
							disabled
							>Next</button
						>
						{:else}
						<button
							onclick={() => (sellersPromise = fetchSellers(sellers.current_page + 1))}
							class="inline-flex items-center justify-center rounded border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
							>Next</button
						>
						{/if}
						{/await}
					</div>
				</div>
			{/if}
		</div>
		{/if}

		<div class="mt-6 border border-gray-200 rounded p-4">
			<h2 class="text-lg font-semibold text-accent mb-3">Comments ({data.item.comment_count})</h2>

			<div class="border border-gray-200 rounded p-3 mb-4 bg-gray-50/30">
				{#if error}
					<div class="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
						{error}
					</div>
				{/if}
				<textarea
					bind:value={content}
					rows="3"
					placeholder="Write a comment..."
					class="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none"></textarea>
				<div class="flex justify-end mt-2">
					<button onclick={comment} disabled={loading} class="btn-secondary px-4 py-1.5 text-sm">
						{#if loading}
							Posting...
						{:else}
							Post Comment
						{/if}
					</button>
				</div>
			</div>

			<div class="space-y-0">
				{#each comments as comment}
					<div class="comment flex gap-3 items-start">
						<img src={config.avatarStorage + "/" + comment.user.id + ".png"} alt="avatar" class="rounded-full w-18 h-18 mt-0.5" />
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-0.5">
								<a href={`/user/profile/${comment.user.id}`} class="text-sm font-semibold text-gray-900">{comment.user.username}</a>
								<span class="text-xs text-gray-500"
									>{timeSince(new Date(comment.created_at))} ago</span
								>
								{#if user && (user.role === 'admin' || user.role === 'moderator')}
									<button onclick={() => deleteComment(comment.id)} class="text-xs text-red-500 hover:text-red-700 ml-auto">Delete</button>
								{/if}
							</div>
							<p class="text-sm text-gray-700">
								{comment.content}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
		{/if}
	</div>
</main>

<style>
	.item-detail-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	@media (min-width: 640px) {
		.item-detail-container {
			flex-direction: row;
			gap: 1.5rem;
		}
	}
	.comment {
		border-bottom: 1px solid #f3f4f6;
		padding: 0.75rem 0;
	}
	.comment:last-child {
		border-bottom: none;
	}

	.rarity-badge {
		position: relative;
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		padding: 0.15rem 0.5rem;
		border-radius: 3px;
		color: #fff;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
		animation: rarityPulse 2.2s infinite ease-in-out;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.modal {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.12),
			0 2px 6px rgba(0, 0, 0, 0.08);
		width: 90%;
		max-width: 480px;
	}
	.modal-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #e5e7eb;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.modal-body {
		padding: 1rem;
		font-size: 0.9rem;
		color: #374151;
	}
	.modal-footer {
		padding: 0.75rem 1rem;
		border-top: 1px solid #e5e7eb;
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}
	.close-btn {
		background: none;
		border: none;
		font-size: 1.25rem;
		color: #6b7280;
		cursor: pointer;
		line-height: 1;
		padding: 0 0.25rem;
	}
	.close-btn:hover {
		color: #1f2937;
	}
	.seller-row {
		border-bottom: 1px solid #f3f4f6;
		padding: 0.6rem 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.seller-row:last-child {
		border-bottom: none;
	}
	.owner-list li {
		list-style: none;
	}
</style>
