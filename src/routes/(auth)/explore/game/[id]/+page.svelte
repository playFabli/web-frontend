<script lang="ts">
	import { goto } from '$app/navigation';
	import { config } from '$lib/config';
	import { onMount } from 'svelte';

	let { data } = $props();
	let token = data.token;
	let game: any = $state(data.game);
	let userVote: string | null = $state(data.game?.user_vote || null);
	
	let commentContent = $state('');
	let submittingComment = $state(false);

	function formatPlays(plays: number) {
		if (plays >= 1000) {
			return (plays / 1000).toFixed(1) + 'k';
		}
		return plays.toString();
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function capitalizeFirst(str: string) {
		if (!str) return '';
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	async function postComment() {
		if (!commentContent.trim()) return;
		
		submittingComment = true;
		try {
			const res = await fetch(`${config.api}/games/${game.id}/comment`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ content: commentContent })
			});
			
			if (res.ok) {
				commentContent = '';
				// Refresh comments
				const commentsRes = await fetch(`${config.api}/games/${game.id}/comments`, {
					headers: {
						'Authorization': `Bearer ${token}`,
						'Accept': 'application/json'
					}
				});
				const comments = await commentsRes.json();
				game.comments = comments;
			}
		} catch (e) {
			console.error('Failed to post comment');
		} finally {
			submittingComment = false;
		}
	}

	async function likeGame() {
		try {
			const res = await fetch(`${config.api}/games/${game.id}/like`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Accept': 'application/json'
				}
			});
			const result = await res.json();
			game.likes_count = result.likes_count;
			game.dislikes_count = result.dislikes_count;
			game.like_ratio = result.like_ratio;
			userVote = result.user_vote;
		} catch (e) {
			console.error('Failed to like game');
		}
	}

	async function dislikeGame() {
		try {
			const res = await fetch(`${config.api}/games/${game.id}/dislike`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Accept': 'application/json'
				}
			});
			const result = await res.json();
			game.likes_count = result.likes_count;
			game.dislikes_count = result.dislikes_count;
			game.like_ratio = result.like_ratio;
			userVote = result.user_vote;
		} catch (e) {
			console.error('Failed to dislike game');
		}
	}
</script>

<style>
	.play-btn {
		background: linear-gradient(180deg, #4ade80 0%, #16a34a 100%);
		border: 1px solid #15803d;
		border-radius: 4px;
		box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 1px 3px rgba(0,0,0,0.12);
		color: #ffffff;
		font-weight: 700;
		text-shadow: 0 1px 1px rgba(0,0,0,0.2);
		cursor: pointer;
		transition: all 0.15s ease;
		display: inline-block;
		text-align: center;
		text-decoration: none;
		padding: 0.75rem 2.5rem;
		font-size: 1.1rem;
	}
	.play-btn:hover {
		background: linear-gradient(180deg, #22c55e 0%, #15803d 100%);
		border-color: #166534;
		box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 10px rgba(0,0,0,0.18);
	}

	.like-bar {
		height: 6px;
		border-radius: 3px;
		background: #e5e7eb;
		overflow: hidden;
		margin: 0.5rem 0;
	}
	.like-fill {
		height: 100%;
		background: #16a34a;
	}

	.comment {
		border-bottom: 1px solid #f3f4f6;
		padding: 0.75rem 0;
	}
	.comment:last-child {
		border-bottom: none;
	}
</style>
<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		{#if !game}
			<div class="text-center py-12">
				<p class="text-gray-500">Game not found.</p>
			</div>
		{:else}
			<!-- Breadcrumb -->
			<div class="text-xs text-gray-500 mb-4">
				<a href="/explore" class="hover:text-primary">Explore</a> ›
				<span class="text-gray-700">{game.title}</span>
			</div>

			<div class="flex flex-col lg:flex-row gap-5">
				<!-- Left: Thumbnail & Play Button -->
				<div class="lg:w-2/5">
					<div class="border border-[#EFE6E2] rounded-lg p-2 bg-white">
						<img src={game.thumbnail_url || `https://placehold.co/600x340/D9C5B2/1A4D4F?text=${encodeURIComponent(game.title)}`} alt={game.title} class="w-full rounded-lg" loading="lazy">
					</div>
					<div class="mt-3 text-center">
						<button onclick={()=>goto(`/explore/game/${game.id}/play`)} class="w-full play-btn">▶ Play Now</button>
					</div>
				</div>

				<!-- Right: Info & Stats -->
				<div class="lg:w-3/5">
					<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white">
						<h1 class="text-xl font-bold text-gray-900 mb-1">{game.title}</h1>
						<p class="text-sm text-gray-600 mb-3">
							By <a href={`/user/profile/${game.creator?.id}`} class="text-primary hover:underline font-medium">{game.creator?.username || 'Unknown'}</a>
						</p>

						<p class="text-sm text-gray-700 leading-relaxed mb-4">
							{game.description || 'No description available for this experience.'}
						</p>

						<!-- Stats row -->
						<div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-4">
							<div>
								<span class="text-gray-500">Plays</span>
								<p class="font-semibold text-gray-900">{formatPlays(game.plays_count)}</p>
							</div>
							<div>
								<span class="text-gray-500">Created</span>
								<p class="font-semibold text-gray-900">{formatDate(game.created_at)}</p>
							</div>
							<div>
								<span class="text-gray-500">Last Updated</span>
								<p class="font-semibold text-gray-900">{formatDate(game.updated_at)}</p>
							</div>
							<div>
								<span class="text-gray-500">Genre</span>
								<p class="font-semibold text-gray-900">{capitalizeFirst(game.genre)}</p>
							</div>
							<div>
								<span class="text-gray-500">Max Players</span>
								<p class="font-semibold text-gray-900">{game.max_players}</p>
							</div>
						</div>

						<!-- Likes / Dislikes Bar -->
						<div class="border-t border-gray-100 pt-3">
							<div class="flex items-center gap-2 mb-1">
								<button 
									class="px-3 py-1 text-xs flex items-center gap-1 rounded-lg border transition-colors
										{userVote === 'like' ? 'bg-green-100 border-green-500 text-green-700' : 'btn-secondary'}" 
									onclick={likeGame}
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-3 mb-1 inline"><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/><path d="M7 10v12"/></svg> <span>{game.likes_count}</span>
								</button>
								<button 
									class="px-3 py-1 text-xs flex items-center gap-1 rounded-lg border transition-colors
										{userVote === 'dislike' ? 'bg-red-100 border-red-500 text-red-700' : 'btn-secondary'}" 
									onclick={dislikeGame}
								>
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-3 mb-1 inline"><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/><path d="M17 14V2"/></svg> <span>{game.dislikes_count}</span>
								</button>
								<span class="text-xs text-gray-500 ml-auto">
									<span>{game.like_ratio}%</span> positive
								</span>
							</div>
							<div class="like-bar">
								<div class="like-fill" style="width: {game.like_ratio}%;"></div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Comments Section -->
			<div class="mt-5 border border-[#EFE6E2] rounded-lg p-4 bg-white">
				<h2 class="text-lg font-semibold mb-3">Comments ({game.comments?.length || 0})</h2>

				<!-- Comment Form -->
				<textarea rows="3" placeholder="Write a comment..." bind:value={commentContent} class="form-input w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"></textarea>
				<div class="flex justify-end mt-2">
					<button class="btn-secondary px-4 py-1 text-sm" onclick={postComment} disabled={submittingComment}>
						{submittingComment ? 'Posting...' : 'Post Comment'}
					</button>
				</div>

				<!-- Existing Comments -->
				<div class="space-y-0">
					{#if game.comments && game.comments.length > 0}
						{#each game.comments as comment}
							<div class="comment flex gap-4">
								<img src={`${config.avatarStorage}/${comment.user.id}.png`} alt="avatar" class="w-18 h-18 mt-0.5">
								<div>
									<div class="flex items-center gap-2 mb-0.5">
										<span class="text-sm font-semibold text-gray-900">{comment.user?.username || 'Unknown'}</span>
										<span class="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
									</div>
									<p class="text-sm text-gray-700">{comment.content}</p>
								</div>
							</div>
						{/each}
					{:else}
						<p class="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</main>