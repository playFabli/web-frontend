<script>
	import { page } from '$app/state';
	import { config } from '$lib/config';

	let { data } = $props();

	let quests = $derived(data.quests ?? []);
	let activities = $derived(data.activities ?? []);
	let newestItems = $derived(data.newestItems ?? []);
	let newestPosts = $derived(data.newestPosts ?? []);
	let newestBlogPosts = $derived(data.newestBlogPosts ?? []);
	let activeTab = $state('daily');
	let claimingId = $state(null);

	// Scoped frame CSS is fetched server-side in +page.server.ts and passed as data.frameCss.
	// Each frame's .avatar-frame selector is rewritten to .avatar-frame-{id} so frames don't collide.
	let frameCss = data.frameCss ?? '';

	let dailyQuests = $derived(quests.filter((q) => q.type === 'daily'));
	let weeklyQuests = $derived(quests.filter((q) => q.type === 'weekly'));
	let challengeQuests = $derived(quests.filter((q) => q.type === 'challenge'));

	function getCurrentQuests() {
		console.log(quests);
		if (activeTab === 'daily') return dailyQuests;
		if (activeTab === 'weekly') return weeklyQuests;
		return challengeQuests;
	}

	function switchTab(tab) {
		activeTab = tab;
	}

	async function claimQuest(questId) {
		claimingId = questId;
		try {
			const res = await fetch(`${config.api}/user/quests/claim/${questId}`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${data.token}`,
					'Content-Type': 'application/json',
					Accept: 'application/json'
				}
			});

			const json = await res.json();
			if (res.ok) {
				// Update quest locally
				quests = quests.map((q) => (q.id === questId ? { ...q, is_claimed: true } : q));
				// Update user coins/exp
				if (json.user) {
					page.data.globalUser = { ...page.data.globalUser, coins: json.user.coins, exp: json.user.exp };
				}
			} else {
				alert(json.message || 'Failed to claim quest');
			}
		} catch (e) {
			alert(e + ' Failed to claim quest');
		} finally {
			claimingId = null;
		}
	}

	function questIcon(type) {
		if (type === 'daily') return 'text-primary/80';
		if (type === 'weekly') return 'text-yellow-600';
		return 'text-purple-600';
	}

	function progressPercent(quest) {
		if (quest.required_value === 0) return 0;
		return Math.min(100, Math.round((quest.current_value / quest.required_value) * 100));
	}

	function timeAgo(dateStr) {
		const now = Date.now();
		const date = new Date(dateStr).getTime();
		const diff = now - date;
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return 'just now';
	}
</script>

<svelte:head>
	{#if frameCss}{@html `<style>${frameCss}</style>`}{/if}
</svelte:head>
<main class="py-6">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
	<div class="flex flex-col md:flex-row md:items-center mb-5 gap-4">
		<img
			class="{page.data.globalUser.avatar_frame_id > 0 ? `avatar-frame-${page.data.globalUser.avatar_frame_id}` : ''} p-1 w-24 h-24 border border-[#EFE6E2]"
			src={`${config.headshotStorage}/${page.data.globalUser.id}.png?t=${Date.now()}`}
			alt=""
		/>
		<h1 class="text-xl font-bold">
			Hello, {page.data.globalUser.username}!
			<p class="mt-1 text-sm font-bold">Level {page.data.globalUser.level} ({page.data.globalUser.exp} / {Math.floor(10 * page.data.globalUser.level * Math.log(page.data.globalUser.level + 1) * 1.25)} XP)</p>
		</h1>
	</div>
	<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
		<div class="col-span-1 md:col-span-6">
				<div class="h-full border border-[#EFE6E2] rounded-lg p-4 mb-4 bg-white">
					<div class="flex items-center justify-between mb-3">
						<h2 class="text-sm font-bold">Quests</h2>
						<div class="flex gap-1">
							<button
								class="btn-secondary px-3 py-1 text-xs {activeTab === 'daily' ? 'active-tab' : ''}"
								onclick={() => switchTab('daily')}
							>
								Daily {#if dailyQuests.length > 0}
									<span class="ml-1 text-xs"
										>{dailyQuests.filter((q) => !q.is_claimed && q.is_completed).length > 0
											? '(вњ“)'
											: ''}</span
									>
								{/if}
							</button>
							<button
								class="btn-secondary px-3 py-1 text-xs {activeTab === 'weekly' ? 'active-tab' : ''}"
								onclick={() => switchTab('weekly')}
							>
								Weekly
							</button>
							<button
								class="btn-secondary px-3 py-1 text-xs {activeTab === 'challenge'
									? 'active-tab'
									: ''}"
								onclick={() => switchTab('challenge')}
							>
								Challenges
							</button>
						</div>
					</div>

					<div class="space-y-3 max-h-[280px] overflow-y-auto pr-1">
						{#each getCurrentQuests() as quest}
							<div
								class="flex items-center justify-between border border-[#EFE6E2] rounded-lg p-4 bg-gray-50/30"
							>
								<div class="flex-1 min-w-0">
									<p class="text-sm font-bold text-gray-900">{quest.name}</p>
									{#if quest.description}
										<p class="text-xs text-gray-600">{quest.description}</p>
									{/if}
									<div class="w-full h-1.5 bg-gray-200 rounded-full mt-2 max-w-xs">
										<div
											class="h-full bg-primary rounded-full"
											style="width: {progressPercent(quest)}%;"
										></div>
									</div>
									<p class="text-xs {quest.is_completed ? 'text-green-600' : 'text-gray-500'} mt-1">
										{quest.is_completed
											? 'вњ“ Complete'
											: `${quest.current_value} / ${quest.required_value}`}
									</p>
								</div>
								<div class="flex items-center gap-2 ml-3 flex-shrink-0">
									<span class="text-xs font-bold text-primary whitespace-nowrap">
										+{quest.coin_reward}
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
										>
									</span>
									{#if quest.is_completed && !quest.is_claimed}
										<button
											class="btn-glossy px-3 py-1 text-xs whitespace-nowrap"
											onclick={() => claimQuest(quest.id)}
											disabled={claimingId === quest.id}
										>
											{claimingId === quest.id ? '...' : 'Claim'}
										</button>
									{:else if quest.is_claimed}
										<span class="text-xs text-green-600 font-bold">Claimed</span>
									{/if}
								</div>
							</div>
						{:else}
							<div class="text-center py-6 text-gray-500">
								<p class="text-sm">No quests available yet. Check back later!</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
			<div class="col-span-1 md:col-span-6">
				<div class="h-full rounded-lg border border-[#EFE6E2] p-4">
					<h2 class="text-sm font-bold mb-3">Activity Feed</h2>
					<div class="space-y-2 max-h-[280px] overflow-y-auto">
						{#each activities as activity}
							<div class="flex items-start gap-2 py-2 border-b border-gray-100 last:border-b-0">
								<img class="{activity.user?.avatar_frame_id > 0 ? `avatar-frame-${activity.user.avatar_frame_id}` : ''} border border-[#EFE6E2] h-10 w-10" src={`${config.headshotStorage}/${activity.user?.id}.png?t=${Date.now()}`} alt="">
								<div class="min-w-0 flex-1">
									<p class="text-sm text-gray-800">
										<span class="font-bold">{activity.user?.username}</span>
										{activity.description}
									</p>
									<p class="text-xs text-gray-400 mt-0.5">{timeAgo(activity.created_at)}</p>
								</div>
							</div>
						{:else}
							<div class="text-center py-6 text-gray-500">
								<p class="text-sm">No recent activity. Start exploring!</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
			<div class="col-span-1 md:col-span-6">
				<div class="border border-[#EFE6E2] rounded-lg p-4 mb-4 bg-white h-full">
					<h2 class="text-sm font-bold mb-3">Newest Marketplace Items</h2>
					{#if newestItems.length === 0}
						<p class="text-xs text-center text-gray-500 py-2">No items available.</p>
					{:else}
						<div class="flex gap-4 overflow-x-auto pb-2">
							{#each newestItems as item}
								<a href="/marketplace/item/{item.id}" class="max-w-[200px] border border-[#EFE6E2] rounded-lg p-4 bg-gray-50/30 hover:shadow-sm transition-shadow">
									<img loading="lazy" src="{config.storage}/items/{item.id}.png" alt="{item.title}" class="w-16 aspect-square object-cover rounded-lg mb-2" />
									<p class="text-sm font-bold text-gray-900 truncate">{item.title}</p>
									<p class="text-xs text-gray-500 mt-1">{item.category?.title}</p>
									<div class="flex items-center gap-2 mt-2">
										{#if item.is_limited}
											<span class="text-[10px] text-gray-500">Stock: {item.stock_left ?? 'в€ћ'}</span>
										{/if}
										<span class="text-xs font-bold text-primary whitespace-nowrap">{item.price} 						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="inline size-4 mb-1"><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" /><path d="M15 6h1v4" /><path d="m6.134 14.768.866-.5 2 3.464" /><circle cx="16" cy="8" r="6" /></svg></span>
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</div>
			<div class="col-span-1 md:col-span-6">
				<div class="border border-[#EFE6E2] rounded-lg p-4 mb-4 bg-white h-full">
					<h2 class="text-sm font-bold mb-3">Newest Forum Posts</h2>
						{#if newestPosts.length === 0}
							<p class="text-xs text-center text-gray-500 py-2">No forum posts available.</p>
						{:else}
							<div class="flex gap-4 overflow-x-auto pb-2">
								{#each newestPosts as post}
									<a href="/forum/thread/{post.id}" class="min-w-[200px] max-w-[200px] border border-[#EFE6E2] rounded-lg p-4 bg-gray-50/30 hover:shadow-sm transition-shadow">
										<img loading="lazy" src="{config.headshotStorage}/{post.user?.id}.png" alt="" class="w-10 h-10 border border-[#EFE6E2] rounded-full mb-2" />
										<p class="text-sm font-bold text-gray-900 truncate">{post.title}</p>
										<p class="text-xs text-gray-500 mt-1">{post.category?.name} вЂў by {post.user?.username}</p>
										<div class="flex items-center gap-2 mt-2">
											{#if post.is_pinned}
												<span class="text-[10px] font-bold text-red-600 uppercase tracking-wide">Pinned</span>
											{/if}
											<span class="text-xs text-gray-400 whitespace-nowrap">{new Date(post.created_at).toLocaleDateString()}</span>
										</div>
									</a>
								{/each}
							</div>
						{/if}
				</div>
			</div>
			<div class="col-span-1 md:col-span-12">
				<div class="border border-[#EFE6E2] p-4 rounded-lg">
					<h2 class="text-sm font-bold mb-3">Events & Announcements</h2>
					{#if newestBlogPosts.length === 0}
						<p class="text-xs text-center text-gray-500 py-2">No announcements yet.</p>
					{:else}
						<div class="flex gap-4 overflow-x-auto pb-2">
							{#each newestBlogPosts as post}
								<a href="/blog/post/{post.id}" class="min-w-[200px] max-w-[200px] border border-[#EFE6E2] rounded-lg p-4 bg-gray-50/30 hover:shadow-sm transition-shadow">
									{#if post.banner_path}
										<img loading="lazy" src="{config.storage}/{post.banner_path}" alt="" class="w-full h-20 object-cover rounded-lg mb-2" />
									{:else}
										<div class="w-full h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg mb-2 flex items-center justify-center">
											<span class="text-lg font-bold text-gray-300">{post.title.charAt(0)}</span>
										</div>
									{/if}
									<p class="text-sm font-bold text-gray-900 truncate">{post.title}</p>
									<p class="text-xs text-gray-500 mt-1">by {post.user?.username}</p>
									<div class="flex items-center gap-2 mt-2">
										{#if post.is_featured}
											<span class="text-[10px] font-bold text-primary uppercase tracking-wide">Featured</span>
										{/if}
										<span class="text-xs text-gray-400 whitespace-nowrap">{new Date(post.created_at).toLocaleDateString()}</span>
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</main>