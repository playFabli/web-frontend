<script>
	import { page } from '$app/state';
	import { config } from '$lib/config';

	let { data } = $props();

	let quests = $state(data.quests ?? []);
	let activities = $state(data.activities ?? []);
	let activeTab = $state('daily');
	let claimingId = $state(null);

	let dailyQuests = $derived(quests.filter((q) => q.type === 'daily'));
	let weeklyQuests = $derived(quests.filter((q) => q.type === 'weekly'));
	let challengeQuests = $derived(quests.filter((q) => q.type === 'challenge'));

	function getCurrentQuests() {
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
					user = { ...user, coins: json.user.coins, exp: json.user.exp };
				}
			} else {
				alert(json.message || 'Failed to claim quest');
			}
		} catch (e) {
			alert('Failed to claim quest');
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

	function activityIcon(type) {
		switch (type) {
			case 'purchase': return '🛒';
			case 'forum_post': return '💬';
			case 'collection_complete': return '🏆';
			case 'level_up': return '⭐';
			case 'item_created': return '🎨';
			case 'quest_complete': return '✅';
			case 'case_open': return '📦';
			default: return '📌';
		}
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
	{#if page.data.globalUser.avatar_frame_id > 0}
		<link
			id="avatar-frame-stylesheet"
			rel="stylesheet"
			href={`${config.storage}/stylesheets/${page.data.globalUser.avatar_frame_id}.css?t=${Date.now()}`}
		/>
	{/if}
</svelte:head>
<main class="py-6">
	<div class="max-w-container mx-auto px-4">
		<div class="flex items-center mb-5">
			<img
				class="avatar-frame p-1 w-24 h-24 border border-gray-200 mr-3"
				src={`${config.headshotStorage}/${page.data.globalUser.id}.png?t=${Date.now()}`}
				alt=""
			/>
			<h1 class="text-xl font-semibold">Hello, {page.data.globalUser.username}!</h1>
		</div>
		<div class="grid grid-cols-12 gap-4">
			<div class="col-span-6">
				<div class="border border-gray-200 rounded p-4 mb-4 bg-white">
					<div class="flex items-center justify-between mb-3">
						<h2 class="text-sm font-semibold">Quests</h2>
						<div class="flex gap-1">
							<button
								class="btn-secondary px-3 py-1 text-xs {activeTab === 'daily' ? 'active-tab' : ''}"
								onclick={() => switchTab('daily')}
							>
								Daily {#if dailyQuests.length > 0}
									<span class="ml-1 text-xs"
										>{dailyQuests.filter((q) => !q.is_claimed && q.is_completed).length > 0
											? '(✓)'
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

					<div class="space-y-3">
						{#each getCurrentQuests() as quest}
							<div
								class="flex items-center justify-between border border-gray-200 rounded p-3 bg-gray-50/30"
							>
								<div class="flex-1 min-w-0">
									<p class="text-sm font-medium text-gray-900">{quest.name}</p>
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
											? '✓ Complete'
											: `${quest.current_value} / ${quest.required_value}`}
									</p>
								</div>
								<div class="flex items-center gap-2 ml-3 flex-shrink-0">
									<span class="text-xs font-semibold text-primary whitespace-nowrap">
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
											class="size-4 inline mb-1 !text-primary/80"
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
										<span class="text-xs text-green-600 font-medium">Claimed</span>
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
			<div class="col-span-6">
				<div class="rounded border border-gray-200 p-3">
					<h2 class="text-sm font-semibold mb-3">Activity Feed</h2>
					<div class="space-y-2 max-h-96 overflow-y-auto">
						{#each activities as activity}
							<div class="flex items-start gap-2 py-2 border-b border-gray-100 last:border-b-0">
								<img class="border border-gray-200 h-10 w-10" src={`${config.headshotStorage}/${activity.user?.id}.png?t=${Date.now()}`} alt="">
								<div class="min-w-0 flex-1">
									<p class="text-sm text-gray-800">
										<span class="font-medium">{activity.user?.username}</span>
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
		</div>
	</div>
</main>