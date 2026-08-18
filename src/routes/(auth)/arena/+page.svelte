<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { config } from "$lib/config";
	import { DoorOpen, Swords, Trophy, ShieldCheck, Check, ArrowRightLeft } from "lucide-svelte";
	import AvatarPreview from "$lib/components/arena/AvatarPreview.svelte";

	// Live arena stats returned by GET /api/arena/stats.
	interface ArenaStats {
		attack: number;
		defense: number;
		max_hp: number;
		arena_tokens: number;
		arena_exp: number;
		online: number;
	}
	let arenaStats = $state<ArenaStats | null>(null);
	let entering = $state(false);
	let enterError = $state<string | null>(null);

	// Daily challenges returned by GET /api/arena/challenges.
	interface ArenaChallenge {
		id: number;
		key: string;
		title: string;
		description: string | null;
		required_value: number;
		current_value: number;
		exp_reward: number;
		token_reward: number;
		is_completed: boolean;
		is_claimed: boolean;
	}
	let challenges = $state<ArenaChallenge[] | null>(null);
	let claimingId = $state<number | null>(null);
	let challengeError = $state<string | null>(null);

	// Matchmaking modal flow.
	interface FighterPreview {
		name: string;
		username?: string;
		attack: number;
		defense: number;
		max_hp: number;
	}

	interface MatchPreview {
		id: number;
		status: string;
		is_robot: boolean;
		opponent_name: string;
		opponent_user_id: number | null;
		player: FighterPreview;
		opponent: FighterPreview;
	}

	let showMatchmakingModal = $state(false);
	let findingOpponent = $state(false);
	let foundMatch = $state<MatchPreview | null>(null);
	let modalError = $state<string | null>(null);

	function openMatchmakingModal() {
		showMatchmakingModal = true;
		findingOpponent = true;
		foundMatch = null;
		modalError = null;
	}

	function closeMatchmakingModal() {
		showMatchmakingModal = false;
		findingOpponent = false;
		foundMatch = null;
		modalError = null;
	}

	function startFight() {
		if (!foundMatch) return;
		goto("/arena/match");
	}

	async function refreshStats() {
		try {
			const res = await fetch(`${config.api}/arena/stats`, {
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${page.data.token}`,
				},
			});
			if (res.ok) {
				const json = await res.json();
				if (json?.data) arenaStats = json.data;
			}
		} catch {
			// Ignore transient failures; existing stats stay as-is.
		}
	}

	// Exchange modal - arena tokens -> currency and arena XP -> XP (both 10:1).
	let showExchangeModal = $state(false);
	let exchangeTokens = $state("0");
	let exchangeExp = $state("0");
	let exchanging = $state(false);
	let exchangeError = $state<string | null>(null);
	let exchangeDone = $state<string | null>(null);

	function openExchangeModal() {
		exchangeTokens = "0";
		exchangeExp = "0";
		exchangeError = null;
		exchangeDone = null;
		showExchangeModal = true;
	}

	function closeExchangeModal() {
		if (exchanging) return;
		showExchangeModal = false;
		exchangeError = null;
		exchangeDone = null;
	}

	// Round a balance down to the largest whole multiple of 10 (the exchange rate).
	function floorToTens(value: number): number {
		return Math.max(0, Math.floor(value / 10) * 10);
	}

	function tokensToCoins(value: number): number {
		return Math.floor(Math.max(0, value) / 10);
	}

	function expToXp(value: number): number {
		return Math.floor(Math.max(0, value) / 10);
	}

	async function doExchange() {
		if (exchanging) return;
		const tokens = parseInt(exchangeTokens || "0", 10) || 0;
		const exp = parseInt(exchangeExp || "0", 10) || 0;
		if (tokens <= 0 && exp <= 0) {
			exchangeError = "Enter an amount to exchange.";
			return;
		}
		exchanging = true;
		exchangeError = null;
		exchangeDone = null;
		try {
			const res = await fetch(`${config.api}/arena/exchange`, {
				method: "POST",
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${page.data.token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ tokens, exp }),
			});
			const json = await res.json().catch(() => null);
			if (!res.ok) {
				exchangeError = json?.message || "Could not complete the exchange.";
				return;
			}
			if (arenaStats) {
				arenaStats.arena_tokens = json?.arena_tokens ?? arenaStats.arena_tokens;
				arenaStats.arena_exp = json?.arena_exp ?? arenaStats.arena_exp;
			}
			exchangeTokens = "0";
			exchangeExp = "0";
			exchangeDone = json?.message || "Exchange successful.";
			await refreshStats();
		} catch {
			exchangeError = "Could not reach the arena.";
		} finally {
			exchanging = false;
		}
	}

	// Determine the player's arena rank based on arena experience.
	// Rank thresholds:
	//   < 150      - Knight I
	//   150-299    - Knight II
	//   300-449    - Knight III
	//   450-649    - Noble I
	//   650-849    - Noble II
	//   850-1099   - Noble III
	//   1100-1349  - King I
	//   1350-1599  - King II
	//   1600-1849  - King III
	//   1850+      - Emperor
	function getRank(exp: number): string {
		const e = Math.max(0, Math.floor(exp));
		if (e < 150) return "Knight I";
		if (e < 300) return "Knight II";
		if (e < 450) return "Knight III";
		if (e < 650) return "Noble I";
		if (e < 850) return "Noble II";
		if (e < 1100) return "Noble III";
		if (e < 1350) return "King I";
		if (e < 1600) return "King II";
		if (e < 1850) return "King III";
		if (e < 2200) return "Emperor I";
		if (e < 2600) return "Emperor II";
		return "Emperor III";
	}

	async function loadChallenges() {
		try {
			const res = await fetch(`${config.api}/arena/challenges`, {
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${page.data.token}`,
				},
			});
			if (!res.ok) throw new Error("load failed");
			const json = await res.json();
			challenges = json?.data ?? [];
		} catch {
			challengeError = "Could not load daily challenges.";
		}
	}

	async function claimChallenge(id: number) {
		if (claimingId !== null) return;
		claimingId = id;
		challengeError = null;
		try {
			const res = await fetch(`${config.api}/arena/challenges/${id}/claim`, {
				method: "POST",
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${page.data.token}`,
				},
			});
			const json = await res.json().catch(() => null);
			if (!res.ok) {
				challengeError = json?.message || "Could not claim that challenge.";
				return;
			}
			const claimed = json?.challenge;
			if (claimed) {
				challenges = (challenges ?? []).map((c) =>
					c.id === claimed.id ? { ...c, is_claimed: true } : c
				);
			}
			await refreshStats();
		} catch {
			challengeError = "Could not claim that challenge.";
		} finally {
			claimingId = null;
		}
	}

	onMount(() => {
		refreshStats();
		loadChallenges();
	});

	async function enterArena() {
		if (entering) return;
		entering = true;
		enterError = null;
		openMatchmakingModal();
		try {
			const res = await fetch(`${config.api}/arena/queue`, {
				method: "POST",
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${page.data.token}`,
				},
			});
			if (!res.ok) {
				const json = await res.json().catch(() => null);
				modalError = json?.message || "Could not find an opponent right now.";
				findingOpponent = false;
				return;
			}
			const json = await res.json();
			foundMatch = json.data;
			// Keep the spinner going for 1-3 seconds before revealing the matchup.
			const waitMs = 1000 + Math.random() * 2000;
			await new Promise((resolve) => setTimeout(resolve, waitMs));
			findingOpponent = false;
		} catch (err) {
			modalError = "Could not reach the arena.";
			findingOpponent = false;
		} finally {
			entering = false;
		}
	}
</script>

<main class="py-8">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<!-- Header -->
		<div class="flex items-center justify-between gap-4 mb-5">
			<h1 class="font-bold text-2xl text-gray-900">Arena</h1>
			<div class="flex items-center gap-3">
				<button class="btn-secondary px-3 py-1 text-sm inline-flex items-center gap-1.5" onclick={openExchangeModal}>
					<ArrowRightLeft class="size-3.5 inline mb-0.5" />
					Exchange
				</button>
				<div class="inline-flex items-center gap-1.5 bg-white border border-[#EFE6E2] rounded-lg px-3 py-1 font-bold text-gray-800 text-sm">
					<span class="text-xs text-gray-400 uppercase tracking-wide">XP</span>
					<span>{arenaStats?.arena_exp ?? '—'}</span>
				</div>
				<div class="inline-flex items-center gap-1.5 bg-white border border-[#EFE6E2] rounded-lg px-3 py-1 font-bold text-gray-800 text-sm">
					<span class="text-xs text-gray-400 uppercase tracking-wide">Tokens</span>
					<span>{arenaStats?.arena_tokens ?? '—'}</span>
				</div>
			</div>
		</div>

		<!-- Arena panel -->
		<div class="border border-[#EFE6E2] rounded-lg overflow-hidden bg-white mb-5">
			<!-- Rank -->
			<div class="flex items-center justify-between px-4 py-2 border-b border-[#EFE6E2]">
				<span class="text-xs font-bold text-gray-500 uppercase tracking-wide">Rank</span>
				<span class="text-2xl font-bold text-primary">{getRank(arenaStats?.arena_exp ?? 0)}</span>
			</div>

			<!-- Avatar stage -->
			<div class="px-5 pt-4">
				<div class="arena-stage rounded-xl overflow-hidden border border-[#EFE6E2]">
					<AvatarPreview height={400} />
				</div>
			</div>

			<!-- ATK / DEF / HP -->
			<div class="grid grid-cols-3 divide-x divide-[#EFE6E2] border-t border-[#EFE6E2] mx-5 mt-4">
				<div class="py-2 text-center">
					<p class="text-xs font-bold text-gray-400 uppercase tracking-wide">ATK</p>
					<p class="text-lg font-bold text-gray-800 mt-0.5">{arenaStats?.attack ?? '—'}</p>
				</div>
				<div class="py-2 text-center">
					<p class="text-xs font-bold text-gray-400 uppercase tracking-wide">DEF</p>
					<p class="text-lg font-bold text-gray-800 mt-0.5">{arenaStats?.defense ?? '—'}</p>
				</div>
				<div class="py-2 text-center">
					<p class="text-xs font-bold text-gray-400 uppercase tracking-wide">Max HP</p>
					<p class="text-lg font-bold text-gray-800 mt-0.5">{arenaStats?.max_hp ?? '—'}</p>
				</div>
			</div>

			<!-- Enter -->
			<div class="p-3">
				<button class="btn-glossy px-4 py-3 w-full flex items-center justify-center gap-2 text-base" onclick={enterArena} disabled={entering}>
					<DoorOpen strokeWidth="3" class="inline mb-1 size-5 shrink-0" />
					<span>{entering ? 'Finding opponent…' : `Enter Arena (${arenaStats?.online ?? 5} online)`}</span>
				</button>
				{#if enterError}
					<p class="text-sm text-red-600 font-semibold text-center mt-2">{enterError}</p>
				{/if}
			</div>
		</div>

		<!-- Daily challenges -->
		<div class="border border-[#EFE6E2] rounded-lg bg-white p-3">
			<div class="flex items-center justify-between mb-3">
				<p class="font-bold text-gray-800 text-sm">Daily Challenges</p>
				{#if challenges}
					<span class="text-xs text-gray-400 font-semibold">Resets daily</span>
				{/if}
			</div>

			{#if challenges === null}
				<div class="flex items-center gap-2 text-sm text-gray-400 py-1">
					<div class="size-4 border-2 border-gray-200 border-t-primary rounded-full animate-spin"></div>
					Loading challenges…
				</div>
			{:else if challenges.length === 0}
				<p class="text-xs text-gray-400">No daily challenges today.</p>
			{:else}
				<div class="space-y-2">
					{#each challenges as c}
						<div class="flex items-start gap-3 border border-[#EFE6E2] rounded-lg p-3">

							<div class="flex-1 min-w-0">
								<div class="flex items-center justify-between gap-2">
									<p class="font-bold text-gray-800 text-sm truncate">{c.title}</p>
									{#if c.is_claimed}
										<span class="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 shrink-0">
											<Check class="size-3.5" />
											Claimed
										</span>
									{:else if c.is_completed}
										<button
											class="btn-glossy px-3 py-1 text-xs shrink-0"
											onclick={() => claimChallenge(c.id)}
											disabled={claimingId === c.id}
										>
											{claimingId === c.id ? 'Claiming…' : 'Claim'}
										</button>
									{:else}
										<span class="text-xs font-bold text-gray-400 tabular-nums shrink-0">
											{c.current_value}/{c.required_value}
										</span>
									{/if}
								</div>

								<p class="text-xs text-gray-500 mt-0.5">{c.description}</p>

								<div class="mt-2 flex items-center gap-3">
									<div class="flex-1">
										<div class="h-1.5 rounded-full bg-gray-200 overflow-hidden">
											<div
												class="h-full rounded-full transition-all"
												class:bg-primary={!c.is_completed}
												class:bg-teal-600={c.is_completed}
												style="width: {Math.min(100, Math.round((c.current_value / c.required_value) * 100))}%"
											></div>
										</div>
									</div>
									<div class="flex items-center gap-1.5 shrink-0">
										<span class="text-[11px] font-bold text-[#A2574F] border border-[#E8D5CD] rounded-md px-1.5 py-0.5">
											+{c.exp_reward} XP
										</span>
										<span class="text-[11px] font-bold text-[#1A4D4F] border border-[#C9D8D9] rounded-md px-1.5 py-0.5">
											+{c.token_reward} ⚔
										</span>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>

				{#if challengeError}
					<p class="text-xs text-red-600 font-semibold mt-2">{challengeError}</p>
				{/if}
			{/if}
		</div>
	</div>
</main>

{#if showMatchmakingModal}
<div class="matchmaking-overlay" onclick={closeMatchmakingModal}>
	<div class="matchmaking-card p-3 border-[#EFE6E2] border bg-white rounded-lg" onclick={(e) => e.stopPropagation()}>
		{#if findingOpponent}
			<div class="flex flex-col items-center gap-4 py-6">
				<div class="size-11 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
				<p class="font-bold text-lg text-gray-900">Finding opponent…</p>
			</div>
		{:else if modalError}
			<div class="flex flex-col items-center gap-3 py-4">
				<div class="text-2xl">⚠️</div>
				<p class="font-bold text-gray-700 text-center">{modalError}</p>
				<div class="flex gap-2 pt-2">
					<button onclick={closeMatchmakingModal} class="btn-secondary px-3 py-1 text-sm">Close</button>
				</div>
			</div>
		{:else if foundMatch}
			<div>
				<h2 class="text-xl font-bold text-gray-900 text-center mb-4">Opponent found!</h2>

				<div class="grid grid-cols-2 gap-3 mb-4">
					<div class="border border-[#EFE6E2] rounded-lg p-3 text-center">
						<div class="flex justify-center mb-2">
							<AvatarPreview height={56} circle />
						</div>
						<p class="text-xs text-gray-500/70 font-bold">You</p>
						<p class="font-bold text-gray-900 mb-1">{foundMatch.player.username || foundMatch.player.name}</p>
						<p class="text-xs text-gray-600">ATK {foundMatch.player.attack} · DEF {foundMatch.player.defense} · HP {foundMatch.player.max_hp}</p>
					</div>
					<div class="border border-[#EFE6E2] rounded-lg p-3 text-center">
						<div class="flex justify-center mb-2">
							<AvatarPreview height={56} circle userId={foundMatch.is_robot ? 2 : (foundMatch.opponent_user_id ?? 2)} />
						</div>
						<p class="text-xs text-gray-500/70 font-bold">{foundMatch.is_robot ? 'Robot' : 'Player'}</p>
						<p class="font-bold text-gray-900 mb-1">{foundMatch.opponent.name}</p>
						<p class="text-xs text-gray-600">ATK {foundMatch.opponent.attack} · DEF {foundMatch.opponent.defense} · HP {foundMatch.opponent.max_hp}</p>
					</div>
				</div>

				<div class="flex gap-2">
					<button onclick={closeMatchmakingModal} class="btn-secondary px-4 py-2 text-sm flex-1">Back</button>
					<button onclick={startFight} class="btn-glossy px-4 py-2 text-sm flex-1">FIGHT</button>
				</div>
			</div>
		{/if}
	</div>
</div>
{/if}

{#if showExchangeModal}
<div class="matchmaking-overlay" onclick={closeExchangeModal}>
	<div class="matchmaking-card exchange-card p-3 border-[#EFE6E2] border bg-white rounded-lg" onclick={(e) => e.stopPropagation()}>
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-lg font-bold text-gray-900">Exchange</h2>
			<button class="text-gray-400 hover:text-gray-700 text-xl leading-none" onclick={closeExchangeModal} aria-label="Close">×</button>
		</div>

		<div class="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
			<ArrowRightLeft class="size-3.5" />
			<span>10 arena tokens = 1 currency &middot; 10 arena XP = 1 XP</span>
		</div>

		<!-- Tokens -> currency -->
		<div class="border border-[#EFE6E2] rounded-lg p-3 mb-3">
			<div class="flex items-center justify-between mb-2">
				<p class="font-bold text-gray-800 text-sm">Arena Tokens</p>
				<span class="text-xs font-bold text-gray-500 tabular-nums">Balance: {arenaStats?.arena_tokens ?? '—'}</span>
			</div>
			<div class="flex items-center gap-2">
				<input
					type="number"
					min="0"
					step="10"
					class="w-full border border-[#E8D5CD] rounded-md px-3 py-1.5 text-sm text-gray-800"
					placeholder="Multiple of 10"
					bind:value={exchangeTokens}
				/>
				<button
					class="btn-secondary px-3 py-1.5 text-xs shrink-0"
					onclick={() => (exchangeTokens = String(floorToTens(arenaStats?.arena_tokens ?? 0)))}
					disabled={!arenaStats}
				>All</button>
			</div>
			<p class="text-xs text-gray-500 mt-2">
				You'll receive <span class="font-bold text-gray-800">{tokensToCoins(parseInt(exchangeTokens || '0', 10))}</span> currency.
			</p>
		</div>

		<!-- Arena XP -> XP -->
		<div class="border border-[#EFE6E2] rounded-lg p-3 mb-3">
			<div class="flex items-center justify-between mb-2">
				<p class="font-bold text-gray-800 text-sm">Arena XP</p>
				<span class="text-xs font-bold text-gray-500 tabular-nums">Balance: {arenaStats?.arena_exp ?? '—'}</span>
			</div>
			<div class="flex items-center gap-2">
				<input
					type="number"
					min="0"
					step="10"
					class="w-full border border-[#E8D5CD] rounded-md px-3 py-1.5 text-sm text-gray-800"
					placeholder="Multiple of 10"
					bind:value={exchangeExp}
				/>
				<button
					class="btn-secondary px-3 py-1.5 text-xs shrink-0"
					onclick={() => (exchangeExp = String(floorToTens(arenaStats?.arena_exp ?? 0)))}
					disabled={!arenaStats}
				>All</button>
			</div>
			<p class="text-xs text-gray-500 mt-2">
				You'll receive <span class="font-bold text-gray-800">{expToXp(parseInt(exchangeExp || '0', 10))}</span> XP.
			</p>
		</div>

		{#if exchangeError}
			<p class="text-xs text-red-600 font-semibold text-center mb-3">{exchangeError}</p>
		{/if}
		{#if exchangeDone}
			<p class="text-xs text-teal-600 font-semibold text-center mb-3">{exchangeDone}</p>
		{/if}

		<div class="flex gap-2">
			<button onclick={closeExchangeModal} class="btn-secondary px-4 py-2 text-sm flex-1" disabled={exchanging}>Cancel</button>
			<button onclick={doExchange} class="btn-glossy px-4 py-2 text-sm flex-1" disabled={exchanging}>
				{exchanging ? 'Exchanging…' : 'Exchange'}
			</button>
		</div>
	</div>
</div>
{/if}
<style>
	.arena-stage {
		background: linear-gradient(180deg, #fdf6f4 0%, #ffffff 100%);
	}

	.matchmaking-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}
	.matchmaking-card {
		width: 100%;
		max-width: 460px;
	}

	.exchange-card {
		max-width: 560px;
	}
</style>
