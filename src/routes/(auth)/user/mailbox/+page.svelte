<script lang="ts">
	import { config } from '$lib/config';
	import { timeSince } from '$lib/timeAgo.js';
	import { goto } from '$app/navigation';
	import {
		Package,
		Sparkles,
		MessageSquare,
		TrendingUp,
		ArrowLeftRight,
		UserPlus,
		Mail,
		CheckCheck,
		Inbox
	} from 'lucide-svelte';

	type NotificationData = {
		id: number;
		type: string;
		title: string;
		body: string | null;
		read_at: string | null;
		created_at: string;
		data?: Record<string, any> | null;
		from_user?: { id: number; username: string } | null;
	};

	type NotificationPage = {
		data: NotificationData[];
		current_page: number;
		last_page: number;
		prev_page_url: string | null;
		next_page_url: string | null;
		total: number;
	};

	type MailboxResponse = {
		data: NotificationPage;
		unread_count: number;
	};

	let { data } = $props<{ data: { token: string } }>();

	let currentPage = $state(1);
	let unreadCount = $state(0);
	let markAllLoading = $state(false);
	let markedIds = $state<Set<number>>(new Set());
	let mailboxPromise = $state(fetchMailbox(1));

	type Meta = { icon: typeof Mail; color: string; url: (d?: Record<string, any> | null) => string | null };

	const typeMeta: Record<string, Meta> = {
		item_bought: { icon: Package, color: '#A2574F', url: (d) => (d?.item_id ? `/marketplace/item/${d.item_id}` : null) },
		admin_item_released: { icon: Sparkles, color: '#b45309', url: (d) => (d?.item_id ? `/marketplace/item/${d.item_id}` : null) },
		forum_reply: { icon: MessageSquare, color: '#2563eb', url: (d) => (d?.thread_id ? `/forum/thread/${d.thread_id}` : null) },
		level_up: { icon: TrendingUp, color: '#16a34a', url: () => null },
		trade_received: { icon: ArrowLeftRight, color: '#7c3aed', url: () => '/user/trades' },
		friend_request: { icon: UserPlus, color: '#db2777', url: () => '/user/homepage' }
	};

	function fetchMailbox(page: number = 1): Promise<MailboxResponse> {
		return fetch(`${config.api}/user/mailbox?page=${page}`, {
			headers: { Authorization: `Bearer ${data.token}`, 'Content-Type': 'application/json', Accept: 'application/json' }
		})
			.then((r) => {
				if (!r.ok) throw new Error('Failed to load mailbox');
				return r.json();
			})
			.then((json: MailboxResponse) => {
				unreadCount = json?.unread_count ?? 0;
				window.dispatchEvent(new CustomEvent('mailbox-unread', { detail: unreadCount }));
				return json;
			});
	}

	function goToPage(page: number) {
		currentPage = page;
		mailboxPromise = fetchMailbox(page);
	}

	async function markAllRead() {
		try {
			markAllLoading = true;
			let response = await fetch(`${config.api}/user/mailbox/read-all`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${data.token}`
				}
			});
			if (response.ok) {
				unreadCount = 0;
				window.dispatchEvent(new CustomEvent('mailbox-unread', { detail: 0 }));
				markedIds = new Set();
				mailboxPromise = fetchMailbox(currentPage);
			}
		} catch (err) {
			console.error(err);
		} finally {
			markAllLoading = false;
		}
	}

	async function openNotification(n: NotificationData, link: string | null) {
		if (!n.read_at && !markedIds.has(n.id)) {
			markedIds.add(n.id);
			if (unreadCount > 0) unreadCount -= 1;
			window.dispatchEvent(new CustomEvent('mailbox-unread', { detail: unreadCount }));
			try {
				await fetch(`${config.api}/user/mailbox/read/${n.id}`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
						Authorization: `Bearer ${data.token}`
					}
				});
			} catch (err) {
				console.error(err);
			}
		}
		if (link) goto(link);
	}

	function isUnread(n: NotificationData): boolean {
		return !n.read_at && !markedIds.has(n.id);
	}

	function handleKeydown(e: KeyboardEvent, n: NotificationData, link: string | null) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			openNotification(n, link);
		}
	}
</script>


<main class="py-6">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<div class="flex items-center justify-between mb-5">
			<h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
				Mailbox
				{#if unreadCount > 0}
					<span class="text-xs font-bold text-white bg-[#A2574F] rounded-full px-2 py-0.5">{unreadCount} unread</span>
				{/if}
			</h1>
			<button
				onclick={markAllRead}
				disabled={markAllLoading || unreadCount === 0}
				class="btn-secondary px-4 py-1 text-sm flex items-center gap-1 disabled:opacity-50"
			>
				<CheckCheck class="inline mb-1 w-4 h-4" />
				Mark all read
			</button>
		</div>

		{#await mailboxPromise}
			<div class="text-sm text-gray-500">Loading mailbox…</div>
		{:then json}
			{#if json?.data?.data?.length}
				<div class="space-y-2">
					{#each json.data.data as n}
						{@const meta = typeMeta[n.type] ?? { icon: Mail, color: '#6b7280', url: () => null }}
						{@const link = meta.url(n.data)}
						{@const Icon = meta.icon}
						<div
							onclick={() => openNotification(n, link)}
							onkeydown={(e) => handleKeydown(e, n, link)}
							role="button"
							tabindex="0"
							class="notification-row cursor-pointer"
							class:unread={isUnread(n)}
						>
							<div class="notification-icon" style={`color: ${meta.color}`}>
								<Icon class="w-5 h-5" />
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex items-center justify-between gap-2">
									<span class="font-bold text-sm text-gray-900">{n.title}</span>
									<span class="text-xs text-gray-400 whitespace-nowrap">{timeSince(n.created_at)} ago</span>
								</div>
								{#if n.body}
									<p class="text-sm text-gray-600">{n.body}</p>
								{/if}
							</div>
							{#if isUnread(n)}
								<span class="w-2 h-2 rounded-full bg-[#A2574F] flex-shrink-0"></span>
							{/if}
						</div>
					{/each}
				</div>

				{#if json.data.last_page > 1}
					<div class="mt-4 pt-3 flex items-center justify-between text-xs text-gray-600">
						<span>Page {json.data.current_page} of {json.data.last_page}</span>
						<div class="flex items-center gap-1">
							{#if json.data.prev_page_url == null}
								<button class="btn-secondary px-2 py-1 text-[11px]" disabled>Prev</button>
							{:else}
								<button class="btn-secondary px-2 py-1 text-[11px]" onclick={() => goToPage(json.data.current_page - 1)}>Prev</button>
							{/if}
							{#if json.data.next_page_url == null}
								<button class="btn-secondary px-2 py-1 text-[11px]" disabled>Next</button>
							{:else}
								<button class="btn-secondary px-2 py-1 text-[11px]" onclick={() => goToPage(json.data.current_page + 1)}>Next</button>
							{/if}
						</div>
					</div>
				{/if}
			{:else}
				<div class="text-center py-16 text-gray-500">
					<Inbox class="w-12 h-12 mx-auto mb-3 text-gray-300" />
					<p class="text-sm">You have no notifications yet.</p>
					<p class="text-xs mt-1">When someone buys your items, replies to your posts, sends you a trade or friend request, or when you level up, it will show up here.</p>
				</div>
			{/if}
		{/await}
	</div>
</main>

<style>
	.notification-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		transition: box-shadow 0.15s ease, background 0.15s ease;
	}
	.notification-row:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);
	}
	.notification-row.unread {
		background: #fdf6f4;
		border-color: #f0d9d4;
	}
	/* .notification-icon {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	} */
</style>
