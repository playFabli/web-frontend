<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { config } from '$lib/config';
	import {
		LogOut,
		Shield,
		Swords,
		Zap,
		Trophy,
		Skull,
		Footprints,
		Sparkles,
		Timer,
		AlertTriangle,
		Keyboard
	} from 'lucide-svelte';
	import AvatarPreview from '$lib/components/arena/AvatarPreview.svelte';

	interface Move {
		position: number;
		name: string;
		damage: number;
		cooldown?: number;
		border_color: string;
	}

	interface Fighter {
		name: string;
		username?: string;
		attack: number;
		defense: number;
		max_hp: number;
		hp: number;
		stamina: number;
		max_stamina: number;
		dodge_cd: number;
		ability_cd: number;
		combo: number;
		vulnerable: boolean;
		exhausted: boolean;
		guarding: boolean;
		moves: Move[];
	}

	interface Telegraph {
		action: string;
		move_name: string;
		text: string;
		sudden: boolean;
	}

	interface MatchPayload {
		id: number;
		status: string;
		is_robot: boolean;
		opponent_name: string;
		opponent_user_id: number | null;
		round: number;
		time_left: number;
		parry_deadline: number | null;
		parry_window: number;
		player: Fighter;
		opponent: Fighter;
		telegraph: Telegraph | null;
		tokens_reward: number;
		xp_reward: number;
		log: string[];
	}

	type Action = 'attack' | 'guard' | 'dodge' | 'ability';

	// Costs mirror the backend balance tuning (MatchController).
	const ATTACK_COST = 25;
	const FINISHER_COST = 45;
	const GUARD_COST = 15;
	const DODGE_COST = 40;
	const ABILITY_COST = 45;
	const MATCH_DURATION = 100; // seconds; highest remaining HP wins

	let match = $state<MatchPayload | null>(null);
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let acting = $state(false);
	let actionError = $state<string | null>(null);

	// The telegraph currently on screen — the opponent's committed action the
	// player is responding to. Swapped for the next round after resolution.
	let currentTelegraph = $state<Telegraph | null>(null);

	// Match clock + parry window pacing (server-authoritative, ticked locally
	// so the countdowns animate smoothly between polls). The clock keeps the
	// last server time_left as a baseline and ticks it down locally each
	// frame, so it always counts down (never stalls or jumps up) between
	// polls.
	let timeLeftBase = $state(MATCH_DURATION);
	let timeLeftRef = $state(Date.now());
	let parryDeadline = $state<number | null>(null);
	let parryWindow = $state(0);
	let now = $state(Date.now());

	// Seconds left on the match clock: server baseline minus local elapsed.
	const timeLeft = $derived(Math.max(0, timeLeftBase - (now - timeLeftRef) / 1000));

	// Staged display values so the round replays visually: opponent's
	// telegraphed action resolves first, the player's response a beat later.
	let displayPlayerHp = $state(0);
	let displayOppHp = $state(0);
	let displayPlayerStamina = $state(0);
	let displayOppStamina = $state(0);
	let displayPlayerGuarding = $state(false);
	let displayOppGuarding = $state(false);

	// Damage floats + per-fighter animation fx (retriggered via keys).
	let playerFloat = $state(0);
	let oppFloat = $state(0);
	let playerFxKey = $state(0);
	let oppFxKey = $state(0);
	let playerFx = $state<string | null>(null);
	let oppFx = $state<string | null>(null);
	let revealedCount = $state(0);

	// The 3D avatar previews stay mounted for the whole match so their
	// Babylon scenes (and texture uploads) survive every round. The fight
	// fx (lunge/guard/dodge/hit) are pure CSS animations on the wrapper div,
	// so instead of `{#key}`-ing the previews (which used to destroy and
	// rebuild the WebGL context on every action, re-streaming textures and
	// eventually leaving them missing/red), we restart the animation with a
	// quick style toggle each round.
	let playerFxEl = $state<HTMLElement | null>(null);
	let oppFxEl = $state<HTMLElement | null>(null);

	function restartCssAnimation(el: HTMLElement | null) {
		if (!el) return;
		el.style.animation = 'none';
		void el.offsetWidth; // force reflow so the class-driven animation restarts
		el.style.animation = '';
	}

	$effect(() => {
		if (playerFxKey <= 0) return;
		const raf = requestAnimationFrame(() => restartCssAnimation(playerFxEl));
		return () => cancelAnimationFrame(raf);
	});

	$effect(() => {
		if (oppFxKey <= 0) return;
		const raf = requestAnimationFrame(() => restartCssAnimation(oppFxEl));
		return () => cancelAnimationFrame(raf);
	});

	let result = $state<'won' | 'lost' | 'draw' | null>(null);

	function sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	function pct(value: number, max: number): number {
		if (max <= 0) return 0;
		return Math.max(0, Math.min(100, (value / max) * 100));
	}

	function applyMatch(m: MatchPayload) {
		match = m;
		currentTelegraph = m.telegraph;
		displayPlayerHp = m.player.hp;
		displayOppHp = m.opponent.hp;
		displayPlayerStamina = m.player.stamina;
		displayOppStamina = m.opponent.stamina;
		displayPlayerGuarding = m.player.guarding;
		displayOppGuarding = m.opponent.guarding;
		revealedCount = m.log?.length ?? 0;
		timeLeftBase = Math.min(m.time_left, timeLeft);
		timeLeftRef = Date.now();
		parryDeadline = m.parry_deadline;
		parryWindow = m.parry_window;
		if (m.status === 'won') result = 'won';
		if (m.status === 'lost') result = 'lost';
		if (m.status === 'draw') result = 'draw';
	}

	async function loadMatch() {
		loading = true;
		loadError = null;
		try {
			const res = await fetch(`${config.api}/arena/match/active`, {
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token as string}`
				}
			});
			const json = await res.json().catch(() => null);
			if (!res.ok || !json) throw new Error('Could not load your match.');
			if (json.data) applyMatch(json.data);
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Could not reach the arena.';
		} finally {
			loading = false;
		}
	}

	// ---- Parry + timer derived state ----
	const parryLeftMs = $derived(parryDeadline ? Math.max(0, parryDeadline - now) : null);
	// The response window has closed: buttons lock until the poll picks up
	// the server's auto-resolved round.
	const tooSlow = $derived(
		!!match && !acting && !result && parryLeftMs !== null && parryLeftMs <= 0
	);
	const parryPct = $derived(
		parryLeftMs !== null && parryWindow > 0
			? Math.max(0, Math.min(100, (parryLeftMs / parryWindow) * 100))
			: 100
	);
	const timePct = $derived(Math.max(0, Math.min(100, (timeLeft / MATCH_DURATION) * 100)));
	const timeLabel = $derived(
		`${Math.floor(timeLeft / 60)}:${(Math.floor(timeLeft) % 60)
			.toString()
			.padStart(2, '0')}`
	);

	/**
	 * The polling loop keeps the stage in sync with rounds the server
	 * auto-resolves (parry window expired while the player was away) and
	 * picks up the match-timer decision.
	 */
	async function pollMatch() {
		if (acting || !match || result) return;
		try {
			const res = await fetch(`${config.api}/arena/match/active`, {
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token as string}`
				}
			});
			const json = await res.json().catch(() => null);
			if (!res.ok || !json?.data) return;
			if (acting || !match) return; // a click may have started mid-flight

			const m = json.data as MatchPayload;
			const prevLen = match.log?.length ?? 0;
			const changed =
				(m.log?.length ?? 0) !== prevLen ||
				m.status !== match.status ||
				m.player.hp !== match.player.hp ||
				m.opponent.hp !== match.opponent.hp ||
				m.telegraph?.text !== currentTelegraph?.text;

			// Nothing new — just refresh the clocks.
			if (!changed) {
				timeLeftBase = Math.min(m.time_left, timeLeft);
				timeLeftRef = Date.now();
				parryDeadline = m.parry_deadline;
				parryWindow = m.parry_window;
				return;
			}

			// Something auto-resolved: reveal the new log entries quickly.
			revealedCount = Math.min(prevLen + 1, m.log?.length ?? 0);
			await sleep(420);
			revealedCount = m.log?.length ?? 0;

			match = m;
			currentTelegraph = m.telegraph;
			displayPlayerHp = m.player.hp;
			displayOppHp = m.opponent.hp;
			displayPlayerStamina = m.player.stamina;
			displayOppStamina = m.opponent.stamina;
			displayPlayerGuarding = m.player.guarding;
			displayOppGuarding = m.opponent.guarding;
			timeLeftBase = Math.min(m.time_left, timeLeft);
			timeLeftRef = Date.now();
			parryDeadline = m.parry_deadline;
			parryWindow = m.parry_window;

			if (m.status === 'won' || m.status === 'lost' || m.status === 'draw') {
				await sleep(400);
				result = m.status;
			}
		} catch {}
	}

	let tickInterval: ReturnType<typeof setInterval>;
	let pollInterval: ReturnType<typeof setInterval>;

	onMount(() => {
		loadMatch();
		tickInterval = setInterval(() => (now = Date.now()), 100);
		pollInterval = setInterval(pollMatch, 700);
		window.addEventListener('keydown', onSeqKeydown);
	});

	onDestroy(() => {
		clearInterval(tickInterval);
		clearInterval(pollInterval);
		window.removeEventListener('keydown', onSeqKeydown);
		if (seqTimer) clearInterval(seqTimer);
	});

	// ---- Attack key-sequence minigame ----
	// When the player attacks, a short sequence of letter keys appears and
	// must be pressed within 3 seconds. It is validated entirely on the
	// client so the timing is exact (no round-trip mid-sequence); only the
	// resulting damage multiplier is sent to the server.
	const SEQ_DURATION = 3000; // ms to press the whole sequence
	const SEQ_LENGTH = 4;
	const SEQ_POOL = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Q', 'W', 'E', 'R', 'T', 'Y'];

	let seqKeys = $state<string[]>([]);
	let seqIndex = $state(0);
	let seqMisses = $state(0);
	let seqTimeLeftMs = $state(SEQ_DURATION);
	let seqPhase = $state<'idle' | 'running' | 'result'>('idle');
	let seqMultiplier = $state(1);
	let seqLabel = $state('');
	let seqWrongTick = $state(0);
	let seqStart = 0;
	let seqTimer: ReturnType<typeof setInterval> | null = null;
	let seqResolveFn: ((m: number) => void) | null = null;

	const seqPct = $derived(Math.max(0, Math.min(100, (seqTimeLeftMs / SEQ_DURATION) * 100)));

	/** Build a random sequence of distinct letter keys (letters only). */
	function pickSequence(): string[] {
		const pool = [...SEQ_POOL];
		const keys: string[] = [];
		for (let i = 0; i < SEQ_LENGTH; i++) {
			keys.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
		}
		return keys;
	}

	/** Run the 3-second key sequence; resolves with the damage multiplier. */
	function runAttackSequence(): Promise<number> {
		return new Promise((resolve) => {
			seqKeys = pickSequence();
			seqIndex = 0;
			seqMisses = 0;
			seqTimeLeftMs = SEQ_DURATION;
			seqPhase = 'running';
			seqMultiplier = 1;
			seqLabel = '';
			seqResolveFn = resolve;
			seqStart = Date.now();
			seqTimer = setInterval(() => {
				seqTimeLeftMs = Math.max(0, SEQ_DURATION - (Date.now() - seqStart));
				if (seqTimeLeftMs <= 0) finishAttackSequence();
			}, 50);
		});
	}

	/**
	 * The sequence ended (every key pressed or time ran out). Misses are
	 * wrong presses plus any keys left unpressed: 0 → ×1.25, 1 → ×1.0,
	 * 2 → ×0.8, 3+ → ×0. The multiplier resolves immediately so the action
	 * request fires the moment the result banner pops.
	 */
	function finishAttackSequence() {
		if (seqPhase !== 'running') return;
		if (seqTimer) {
			clearInterval(seqTimer);
			seqTimer = null;
		}

		const misses = seqMisses + (seqKeys.length - seqIndex);
		seqMisses = misses;
		seqMultiplier = misses === 0 ? 1.25 : misses === 1 ? 1 : misses === 2 ? 0.8 : 0;
		seqLabel =
			misses === 0 ? 'PERFECT!' : misses === 1 ? 'GOOD' : misses === 2 ? 'SLOPPY' : 'WHIFFED';
		seqPhase = 'result';

		const done = seqResolveFn;
		seqResolveFn = null;
		done?.(seqMultiplier);
	}

	/** Global key listener — only active while the sequence is running. */
	function onSeqKeydown(e: KeyboardEvent) {
		if (seqPhase !== 'running' || seqKeys.length === 0) return;
		if (e.repeat) return; // holding a key shouldn't count as extra presses
		const key = e.key;
		if (key.length !== 1 || !/[a-zA-Z]/.test(key)) return;
		e.preventDefault();
		if (key.toUpperCase() === seqKeys[seqIndex]) {
			seqIndex += 1;
			if (seqIndex >= seqKeys.length) finishAttackSequence();
		} else {
			seqMisses += 1;
			seqWrongTick += 1;
		}
	}

	/** Map a telegraphed action to the opponent's on-stage animation. */
	function animForAction(action: string | undefined): string {
		switch (action) {
			case 'guard':
				return 'guard';
			case 'dodge':
				return 'dodge';
			case 'ability':
				return 'ability';
			default:
				return 'lunge';
		}
	}

	async function takeAction(action: Action) {
		if (acting || !match || result) return;

		const prevPlayerHp = match.player.hp;
		const prevOppHp = match.opponent.hp;
		const prevLogLen = match.log?.length ?? 0;
		const oppDid = currentTelegraph?.action;

		// Anti-lag parry: record how much time was left in the parry window at
		// the exact moment of the click. The server uses this to decide whether
		// the parry counted, so a click that beats the window on the client is
		// honoured even if the request arrives just after the server deadline.
		const parryLeftMs =
			parryDeadline !== null ? Math.max(0, Math.ceil(parryDeadline - Date.now())) : null;

		acting = true;
		actionError = null;

		try {
			// Attacks run the key-sequence minigame first. It is validated on
			// the client so the key timing is exact — no network round-trip in
			// the middle of the sequence — and only the resulting damage
			// multiplier travels to the server. The parry time above was
			// captured before the sequence, so a just-in-time click is still
			// honoured after the ~3s of key presses.
			let multiplier = 1;
			if (action === 'attack') {
				multiplier = await runAttackSequence();
			}

			const res = await fetch(`${config.api}/arena/match/${match.id}/action`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token as string}`
				},
				body: JSON.stringify({
					action,
					parry_left_ms: parryLeftMs,
					damage_multiplier: multiplier
				})
			});
			const json = await res.json().catch(() => null);
			if (!res.ok) {
				actionError = json?.message || 'That action could not be performed.';
				return;
			}

			const updated = json.data as MatchPayload;
			const playerDamage = Math.max(0, prevOppHp - updated.opponent.hp);
			const opponentDamage = Math.max(0, prevPlayerHp - updated.player.hp);

			// Authoritative state is stored up front; the stage replays the
			// exchange one fighter at a time for a readable turn flow.
			match = updated;
			displayPlayerStamina = updated.player.stamina;
			displayOppStamina = updated.opponent.stamina;

			// Beat 1: the opponent's telegraphed action lands.
			displayOppHp = updated.opponent.hp;
			displayOppGuarding = updated.opponent.guarding;
			displayPlayerHp = prevPlayerHp;
			displayPlayerGuarding = false;

			oppFx = animForAction(oppDid);
			oppFxKey += 1;
			if (opponentDamage > 0) {
				playerFloat = opponentDamage;
				playerFx = 'hit';
				playerFxKey += 1;
			}
			revealedCount = Math.min(prevLogLen + 1, updated.log?.length ?? 0);

			await sleep(900);

			// Beat 2: the player's response resolves.
			displayPlayerHp = updated.player.hp;
			displayPlayerGuarding = updated.player.guarding;
			playerFx = animForAction(action);
			playerFxKey += 1;
			if (playerDamage > 0) {
				oppFloat = playerDamage;
				oppFx = 'hit';
				oppFxKey += 1;
			}
			revealedCount = updated.log?.length ?? 0;

			await sleep(900);

			oppFx = null;
			playerFx = null;
			playerFloat = 0;
			oppFloat = 0;
			currentTelegraph = updated.telegraph;

			timeLeftBase = Math.min(updated.time_left, timeLeft);
			timeLeftRef = Date.now();
			parryDeadline = updated.parry_deadline;
			parryWindow = updated.parry_window;

			if (updated.status === 'won' || updated.status === 'lost' || updated.status === 'draw') {
				await sleep(500);
				result = updated.status;
			}
		} catch (e) {
			actionError = 'Could not reach the arena.';
		} finally {
			acting = false;
			seqPhase = 'idle';
		}
	}

	async function quitMatch() {
		if (!match || acting) return;
		acting = true;
		try {
			await fetch(`${config.api}/arena/match/${match.id}/quit`, {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token as string}`
				}
			});
		} catch {}
		goto('/arena');
	}

	// ---- Derived state for the action bar ----
	const playerMove1 = $derived(match?.player.moves?.find((m) => m.position === 1) ?? null);
	const playerMove2 = $derived(match?.player.moves?.find((m) => m.position === 2) ?? null);
	const isFinisher = $derived((match?.player.combo ?? 0) >= 2);
	const attackCost = $derived(isFinisher ? FINISHER_COST : ATTACK_COST);
	const playerExhausted = $derived(match?.player.exhausted ?? false);
	const canAct = $derived(!!match && !acting && !result && !tooSlow);

	const canAttack = $derived(canAct && !playerExhausted && displayPlayerStamina >= attackCost);
	const canDodge = $derived(
		canAct &&
			!playerExhausted &&
			displayPlayerStamina >= DODGE_COST &&
			(match?.player.dodge_cd ?? 0) <= 0
	);
	const canAbility = $derived(
		canAct &&
			!!playerMove2 &&
			!playerExhausted &&
			displayPlayerStamina >= ABILITY_COST &&
			(match?.player.ability_cd ?? 0) <= 0
	);

	const opponentPreviewUserId = $derived(
		match ? (match.is_robot ? 2 : (match.opponent_user_id ?? 2)) : undefined
	);

	const opponentComboLabel = $derived(
		match && match.opponent.combo >= 1 ? `Combo ×${match.opponent.combo + 1}` : null
	);
</script>

{#snippet bar(label: string, value: number, max: number, gradient: string)}
	<div class="stat-bar">
		<span class="stat-bar-label">{label}</span>
		<div class="stat-bar-track">
			<div class="stat-bar-fill" style="width: {pct(value, max)}%; background: {gradient};"></div>
		</div>
		<span class="stat-bar-value">{Math.max(0, value)}/{max}</span>
	</div>
{/snippet}

<main class="py-6">
	<div class="w-full sm:max-w-[70%] mx-auto px-4">
		<div class="grid grid-cols-12 gap-4">
			<div class="col-span-1"></div>
			<div class="col-span-8">
				<h1 class="font-bold text-xl">Arena Match</h1>
			</div>
			<div class="col-span-2 text-right font-bold">
				{#if match && !result}
					<div class="flex items-center justify-end gap-3">
						<span class="text-sm text-gray-500">Round {match.round}</span>
						<button onclick={quitMatch} class="btn-secondary px-3 py-1 text-sm" disabled={acting}>
							<LogOut strokeWidth="3" class="inline size-4 mb-0.5" /> Quit
						</button>
					</div>
				{/if}
			</div>
			<div class="col-span-1"></div>

			<div class="col-span-1"></div>
			<div class="col-span-10">
				{#if loading}
					<div class="border border-gray-200 rounded-lg p-10 flex flex-col items-center gap-3">
						<div
							class="size-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin"
						></div>
						<p class="text-sm text-gray-500 font-bold">Loading your match…</p>
					</div>
				{:else if loadError}
					<div class="border border-gray-200 rounded-lg p-10 text-center">
						<p class="font-bold text-red-600 mb-3">{loadError}</p>
						<a href="/arena" class="btn-secondary px-4 py-1 text-sm">Back to Arena</a>
					</div>
				{:else if !match}
					<div class="border border-gray-200 rounded-lg p-10 text-center">
						<p class="font-bold text-gray-900 mb-1">No active fight</p>
						<p class="text-sm text-gray-500 mb-4">Queue up in the arena to find an opponent.</p>
						<a href="/arena" class="btn-glossy px-4 py-1 text-sm">Enter the Arena</a>
					</div>
				{:else}
					<!-- ============ THE ARENA ============ -->
					<div class="relative border border-gray-200 rounded-lg bg-white overflow-hidden mb-3">
						<!-- Match clock: highest remaining HP wins when it hits zero. -->
						<div class="match-timer px-4 py-2 border-b border-gray-100 bg-gray-50">
							<div class="flex items-center gap-2">
								<Timer class="size-3.5 text-gray-400" strokeWidth="3" />
								<div class="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
									<div
										class="timer-fill"
										class:timer-critical={timeLeft <= 15}
										style="width: {timePct}%;"
									></div>
								</div>
								<span
									class="text-xs font-bold tabular-nums {timeLeft <= 15
										? 'text-red-600 animate-pulse'
										: 'text-gray-500'}">{timeLabel}</span
								>
							</div>
							<p class="text-[10px] font-bold text-gray-400 mt-1">
								Parry each attack within the window or it goes through — time out and higher HP wins
							</p>
						</div>
						<div class="arena-stage">
							<!-- Player (left) -->
							<div class="fighter-col fighter-col-player">
								<div class="fighter-top">
									<div class="fighter-name-wrap">
										<p class="fighter-name">
											You <span class="text-gray-400 font-semibold"
												>({match.player.username ?? 'Fighter'})</span
											>
										</p>
									</div>
									<span class="stat-chip"
										>ATK {match.player.attack} · DEF {match.player.defense}</span
									>
								</div>
								<div class="avatar-frame relative">
									<div
										class="avatar-fx"
										bind:this={playerFxEl}
										class:fx-lunge={playerFx === 'lunge'}
										class:fx-guard={playerFx === 'guard'}
										class:fx-dodge={playerFx === 'dodge'}
										class:fx-ability={playerFx === 'ability'}
										class:fx-hit={playerFx === 'hit'}
									>
										<AvatarPreview height={170} />
									</div>
									{#if playerFloat > 0}
										<span class="damage-float damage-float-taken">-{playerFloat}</span>
									{/if}
									{#if displayPlayerGuarding}
										<div class="guard-flash"><Shield class="size-6" strokeWidth="2.5" /></div>
									{/if}
								</div>
								<div class="fighter-bars">
									{@render bar(
										'HP',
										displayPlayerHp,
										match.player.max_hp,
										'linear-gradient(90deg, #22c55e, #4ade80)'
									)}
									{@render bar(
										'STAM',
										displayPlayerStamina,
										match.player.max_stamina,
										'linear-gradient(90deg, #f59e0b, #fbbf24)'
									)}
								</div>
								<div class="fighter-chips">
									{#if displayPlayerGuarding}
										<span class="guard-chip"
											><Shield class="size-3" strokeWidth="3" /> Guarding</span
										>
									{/if}
									{#if match.player.vulnerable}
										<span class="danger-chip"
											><AlertTriangle class="size-3" strokeWidth="3" /> Vulnerable</span
										>
									{/if}
									{#if match.player.exhausted}
										<span class="danger-chip danger-chip-pulse">Exhausted</span>
									{/if}
								</div>
								<div class="combo-pips" class:combo-ready={isFinisher}>
									<span class="combo-label">Combo</span>
									{#each [0, 1, 2] as i}
										<span class="pip" class:pip-filled={i < match.player.combo}></span>
									{/each}
									<span class="combo-status"
										>{isFinisher
											? 'FINISHER READY'
											: match.player.combo > 0
												? `Hit ${match.player.combo + 1} of 3`
												: '1st hit'}</span
									>
								</div>
							</div>

							<!-- Center: telegraph -->
							<div class="arena-center">
								<div class="vs-badge">VS</div>
								<div class="telegraph-box" class:telegraph-sudden={currentTelegraph?.sudden}>
									{#if currentTelegraph}
										<p class="telegraph-text">
											{#if currentTelegraph.sudden}
												<Zap class="size-4 inline -mt-0.5 text-red-500" strokeWidth="3" />
											{:else if currentTelegraph.action === 'guard'}
												<Shield class="size-4 inline -mt-0.5 text-sky-500" strokeWidth="3" />
											{:else if currentTelegraph.action === 'dodge'}
												<Footprints class="size-4 inline -mt-0.5 text-indigo-500" strokeWidth="3" />
											{:else if currentTelegraph.action === 'ability'}
												<Sparkles class="size-4 inline -mt-0.5 text-fuchsia-500" strokeWidth="3" />
											{:else}
												<Swords class="size-4 inline -mt-0.5 text-primary" strokeWidth="3" />
											{/if}
											{currentTelegraph.text}
										</p>
										<p class="telegraph-prompt">
											{#if acting}
												<span class="inline-flex items-center gap-1.5 text-primary">
													<div
														class="size-3 border-2 border-primary border-t-transparent rounded-full animate-spin"
													></div>
													Resolving…
												</span>
											{:else if tooSlow}
												<span class="text-red-600 font-extrabold">Too slow — the attack lands!</span
												>
											{:else if parryLeftMs !== null}
												<span class="text-gray-500"
													>Parry in {(parryLeftMs / 1000).toFixed(1)}s</span
												>
											{:else}
												<span>Choose your response</span>
											{/if}
										</p>
										{#if parryLeftMs !== null && !acting && !result}
											<div class="parry-track mt-1.5">
												<div
													class="parry-fill"
													class:parry-critical={parryPct <= 25}
													style="width: {parryPct}%;"
												></div>
											</div>
										{/if}
									{:else}
										<p class="telegraph-text text-gray-400">Waiting for the opponent…</p>
									{/if}
								</div>
							</div>

							<!-- Opponent (right) -->
							<div class="fighter-col fighter-col-opp">
								<div class="fighter-top fighter-top-right">
									<div class="fighter-name-wrap">
										<p class="fighter-name">
											{match.opponent_name}
											{#if match.is_robot}
												<span class="badge-tag">Robot</span>
											{/if}
										</p>
										<p class="fighter-sub">{opponentComboLabel ?? ''}</p>
									</div>
									<span class="stat-chip"
										>ATK {match.opponent.attack} · DEF {match.opponent.defense}</span
									>
								</div>
								<div class="avatar-frame relative">
									<div
										class="avatar-fx"
										bind:this={oppFxEl}
										class:fx-lunge={oppFx === 'lunge'}
										class:fx-guard={oppFx === 'guard'}
										class:fx-dodge={oppFx === 'dodge'}
										class:fx-ability={oppFx === 'ability'}
										class:fx-hit={oppFx === 'hit'}
									>
										<AvatarPreview userId={opponentPreviewUserId} height={170} mirrored />
									</div>
									{#if oppFloat > 0}
										<span class="damage-float damage-float-dealt">-{oppFloat}</span>
									{/if}
									{#if displayOppGuarding}
										<div class="guard-flash"><Shield class="size-6" strokeWidth="2.5" /></div>
									{/if}
								</div>
								<div class="fighter-bars">
									{@render bar(
										'HP',
										displayOppHp,
										match.opponent.max_hp,
										'linear-gradient(90deg, #22c55e, #4ade80)'
									)}
									{@render bar(
										'STAM',
										displayOppStamina,
										match.opponent.max_stamina,
										'linear-gradient(90deg, #f59e0b, #fbbf24)'
									)}
								</div>
								<div class="fighter-chips">
									{#if displayOppGuarding}
										<span class="guard-chip"
											><Shield class="size-3" strokeWidth="3" /> Guarding</span
										>
									{/if}
									{#if match.opponent.vulnerable}
										<span class="danger-chip"
											><AlertTriangle class="size-3" strokeWidth="3" /> Vulnerable</span
										>
									{/if}
									{#if match.opponent.exhausted}
										<span class="danger-chip danger-chip-pulse">Exhausted</span>
									{/if}
								</div>
								<div class="combo-pips" class:combo-ready={(match.opponent.combo ?? 0) >= 2}>
									<span class="combo-label">Combo</span>
									{#each [0, 1, 2] as i}
										<span class="pip" class:pip-filled={i < match.opponent.combo}></span>
									{/each}
									<span class="combo-status"
										>{(match.opponent.combo ?? 0) >= 2 ? 'FINISHER READY' : '—'}</span
									>
								</div>
							</div>
						</div>
						{#if seqPhase !== 'idle'}
							{#if seqPhase === 'running'}
								<div class="seq-overlay">
									<div class="seq-card">
										<p class="seq-title">
											{isFinisher ? 'Finisher sequence' : 'Strike sequence'} — press the keys
										</p>
										<div class="seq-bar-track">
											<div
												class="seq-bar-fill"
												class:seq-bar-critical={seqPct <= 25}
												style="width: {seqPct}%;"
											></div>
										</div>
										{#key seqWrongTick}
											<div class="seq-keys" class:seq-shake={seqWrongTick > 0}>
												{#each seqKeys as key, i}
													<span
														class="seq-key"
														class:seq-key-done={i < seqIndex}
														class:seq-key-next={i === seqIndex}>{key}</span
													>
												{/each}
											</div>
										{/key}
										<p class="seq-hint">
											Press the highlighted key · {seqIndex}/{seqKeys.length}
											<span class="seq-miss"> · {seqMisses} miss{seqMisses === 1 ? '' : 'es'}</span>
										</p>
									</div>
								</div>
							{:else}
								<div class="seq-result-banner">
									<span
										class="seq-result-label"
										class:seq-result-perfect={seqMultiplier >= 1.25}
										class:seq-result-good={seqMultiplier === 1}
										class:seq-result-sloppy={seqMultiplier === 0.8}
										class:seq-result-whiffed={seqMultiplier === 0}>{seqLabel}</span
									>
									<span
										class="seq-result-mult"
										class:seq-mult-perfect={seqMultiplier >= 1.25}
										class:seq-mult-good={seqMultiplier === 1}
										class:seq-mult-sloppy={seqMultiplier === 0.8}
										class:seq-mult-whiffed={seqMultiplier === 0}
										>×{seqMultiplier.toFixed(2)} damage</span
									>
								</div>
							{/if}
						{/if}
					</div>

					<!-- ============ FIGHTING UI ============ -->
					<div class="border border-gray-200 rounded-lg bg-white overflow-hidden">
						<!-- Battle log -->
						<div class="px-4 py-3 border-b border-gray-100">
							<div class="flex items-center justify-between mb-1.5">
								<p class="text-xs font-bold text-gray-500">
									{#if currentTelegraph && !acting && !result}
										<span class="inline-flex items-center gap-1.5 text-primary">
											<Zap strokeWidth="3" class="size-3 animate-pulse" />
											{currentTelegraph.text}
										</span>
									{:else if acting}
										<span class="inline-flex items-center gap-1.5 text-amber-600">
											<Timer strokeWidth="3" class="size-3 animate-pulse" /> Resolving the exchange…
										</span>
									{:else}
										The fight continues.
									{/if}
								</p>
								<p class="text-xs font-bold text-gray-500">Round {match.round}</p>
							</div>
							<div class="battle-log">
								{#if (match.log?.length ?? 0) === 0}
									<p class="text-xs text-gray-400 font-bold text-center py-1">
										The opponent makes its move — respond!
									</p>
								{:else}
									{#each (match.log ?? []).slice(0, revealedCount) as entry, i (i)}
										<div class="log-entry" class:log-mine={entry.startsWith('You')}>
											<span class="log-dot"></span>
											<span>{entry}</span>
										</div>
									{/each}
									{#if acting && (match.log?.length ?? 0) > revealedCount}
										<div class="log-entry log-pending">
											<span class="log-dot"></span>
											<span class="italic text-gray-400">…</span>
										</div>
									{/if}
								{/if}
							</div>
						</div>

						<!-- Action buttons -->
						<div class="p-4">
							<div class="flex items-center justify-between mb-2">
								<p class="text-xs font-bold text-gray-500 flex items-center gap-1.5">
									<span class="turn-dot" class:turn-dot-live={canAct}></span>
									{canAct
										? 'Your turn — respond!'
										: acting
											? 'Resolving…'
											: tooSlow
												? 'Too slow…'
												: 'Waiting for the opponent…'}
								</p>
								<p class="text-xs font-bold text-gray-400">
									{playerExhausted
										? 'Exhausted — guard to recover stamina'
										: `Stamina regens +12/round`}
								</p>
							</div>
							<div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
								<!-- Attack -->
								<button
									class="move-btn"
									class:move-btn-disabled={!canAttack}
									style="--mc: {playerMove1?.border_color ?? '#A2574F'}"
									onclick={() => takeAction('attack')}
									disabled={!canAttack}
								>
									<span class="move-name">
										<Swords class="size-3.5 inline -mt-0.5" strokeWidth="3" />
										{isFinisher
											? (playerMove1?.name ?? 'Finisher') + ' — FINISHER'
											: (playerMove1?.name ?? 'Strike')}
									</span>
									<span class="move-dmg"
										>{isFinisher ? 'Heavy · ' : ''}{playerMove1?.damage ??
											match.player.attack}{isFinisher ? '×1.6' : ' DMG'}</span
									>
									<span class="move-cost">{attackCost} stamina</span>
								</button>

								<!-- Guard -->
								<button
									class="move-btn move-guard"
									class:move-btn-disabled={!canAct}
									style="--mc: #0e7490"
									onclick={() => takeAction('guard')}
									disabled={!canAct}
								>
									<span class="move-name"
										><Shield class="size-3.5 inline -mt-0.5" strokeWidth="3" /> Guard</span
									>
									<span class="move-dmg">Blocks normal attacks</span>
									<span class="move-cost"
										>{playerExhausted ? 'Rest · free' : `${GUARD_COST} stamina`}</span
									>
								</button>

								<!-- Dodge -->
								<button
									class="move-btn move-dodge"
									class:move-btn-disabled={!canDodge}
									style="--mc: #6d28d9"
									onclick={() => takeAction('dodge')}
									disabled={!canDodge}
								>
									<span class="move-name"
										><Footprints class="size-3.5 inline -mt-0.5" strokeWidth="3" /> Dodge</span
									>
									<span class="move-dmg">Evades everything</span>
									<span class="move-cost">
										{#if (match?.player.dodge_cd ?? 0) > 0}
											<span class="cd-badge">CD {match?.player.dodge_cd}</span>
										{:else}
											{DODGE_COST} stamina
										{/if}
									</span>
								</button>

								<!-- Ability -->
								<button
									class="move-btn move-ability"
									class:move-btn-disabled={!canAbility}
									style="--mc: {playerMove2?.border_color ?? '#A2574F'}"
									onclick={() => takeAction('ability')}
									disabled={!canAbility}
								>
									<span class="move-name"
										><Sparkles class="size-3.5 inline -mt-0.5" strokeWidth="3" />
										{playerMove2?.name ?? 'Ability'}</span
									>
									<span class="move-dmg">{playerMove2?.damage ?? 0} DMG · Pierces guard</span>
									<span class="move-cost">
										{#if (match?.player.ability_cd ?? 0) > 0}
											<span class="cd-badge">CD {match?.player.ability_cd}</span>
										{:else}
											{ABILITY_COST} stamina
										{/if}
									</span>
								</button>
							</div>

							{#if actionError}
								<p class="text-sm text-red-600 font-semibold text-center mt-3">{actionError}</p>
							{/if}

							<div class="tips-row mt-4">
								<span class="tip"
									><Swords class="size-3 inline -mt-0.5" /> 3 hits = FINISHER, breaks guards</span
								>
								<span class="tip"
									><Shield class="size-3 inline -mt-0.5" /> Guard breaks vs heavy/ability</span
								>
								<span class="tip"
									><Footprints class="size-3 inline -mt-0.5" /> Dodge = 3-round cooldown</span
								>
								<span class="tip"
									><Sparkles class="size-3 inline -mt-0.5" /> Attack interrupts a heavy windup</span
								>
								<span class="tip"
									><Keyboard class="size-3 inline -mt-0.5" /> Perfect key sequence = ×1.25 damage</span
								>
							</div>
						</div>
					</div>
				{/if}
			</div>
			<div class="col-span-1"></div>
		</div>
	</div>
</main>

{#if result}
	<div class="matchmaking-overlay">
		<div class="matchmaking-card text-center">
			{#if result === 'won'}
				<div class="text-5xl mb-2">
					<Trophy class="size-12 inline text-yellow-500" strokeWidth="2.5" />
				</div>
				<h2 class="text-2xl font-bold text-gray-900 mb-1">Victory!</h2>
				<p class="text-sm text-gray-600 mb-4">You defeated {match?.opponent_name}.</p>
			{:else if result === 'draw'}
				<div class="text-5xl mb-2">
					<Timer class="size-12 inline text-gray-400" strokeWidth="2.5" />
				</div>
				<h2 class="text-2xl font-bold text-gray-900 mb-1">Draw!</h2>
				<p class="text-sm text-gray-600 mb-4">Time ran out with both fighters standing.</p>
			{/if}
			<div class="flex gap-3 justify-center mb-5">
				<div class="reward-chip">
					<Swords class="size-3.5 inline -mt-0.5" strokeWidth="3" /> +{match?.tokens_reward ?? 0} tokens
				</div>
				<div class="reward-chip">
					<Zap class="size-3.5 inline -mt-0.5" strokeWidth="3" /> +{match?.xp_reward ?? 0} XP
				</div>
			</div>
			<p class="text-xs text-gray-400 font-bold mb-4">
				{result === 'draw'
					? 'A draw pays a consolation — improve your gear and rematch!'
					: 'Improve your gear and fight again!'}
			</p>
			<button onclick={() => goto('/arena')} class="btn-glossy px-5 py-2 text-sm"
				>Return to Arena</button
			>
		</div>
	</div>
{/if}

<style>
	/* ---------- Match timer ---------- */
	.timer-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #22c55e, #f59e0b);
		transition: width 1s linear;
	}
	.timer-critical {
		background: linear-gradient(90deg, #f59e0b, #dc2626);
	}

	/* ---------- Parry window ---------- */
	.parry-track {
		height: 5px;
		background: #f3f4f6;
		border: 1px solid #e5e7eb;
		border-radius: 999px;
		overflow: hidden;
	}
	.parry-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #a2574f, #f59e0b);
		transition: width 0.1s linear;
	}
	.parry-critical {
		background: #dc2626;
		animation: guardPulse 0.5s infinite ease-in-out;
	}

	/* ---------- Arena stage (light, matches the arena lobby card) ---------- */
	.arena-stage {
		position: relative;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 1.25rem 1.5rem;
		min-height: 360px;
		background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
	}

	/* Arena floor: a soft glowing ellipse under the fighters. */
	.arena-stage::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: 10px;
		transform: translateX(-50%);
		width: 86%;
		height: 40px;
		background: radial-gradient(
			50% 100% at 50% 50%,
			rgba(162, 87, 79, 0.12) 0%,
			rgba(162, 87, 79, 0.04) 45%,
			transparent 75%
		);
		border-radius: 50%;
		pointer-events: none;
	}

	.fighter-col {
		flex: 0 1 36%;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
		z-index: 1;
	}

	.fighter-top {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.6rem;
		width: 100%;
		justify-content: center;
	}
	.fighter-top-right {
		flex-direction: row-reverse;
	}
	.fighter-name {
		font-size: 0.85rem;
		font-weight: 800;
		color: #1f2937;
		line-height: 1.2;
	}
	.fighter-sub {
		display: block;
		font-size: 0.6rem;
		font-weight: 700;
		color: #9ca3af;
		min-height: 0.75rem;
	}
	.stat-chip {
		font-size: 0.62rem;
		font-weight: 800;
		color: #6b7280;
		background: #f3f4f6;
		border: 1px solid #e5e7eb;
		border-radius: 999px;
		padding: 0.1rem 0.5rem;
		white-space: nowrap;
	}

	.avatar-frame {
		width: 100%;
		max-width: 170px;
		height: 180px;
		border-radius: 10px;
		overflow: hidden;
		border: 1px solid #e5e7eb;
		background: #f3f4f6;
	}

	.avatar-fx {
		height: 100%;
	}

	/* Player lunges right toward the centre. */
	@keyframes lungeRight {
		0% {
			transform: translateX(0) scale(1);
		}
		30% {
			transform: translateX(30px) scale(1.05) rotate(2deg);
		}
		100% {
			transform: translateX(0) scale(1);
		}
	}
	.fx-lunge {
		animation: lungeRight 0.8s cubic-bezier(0.22, 1, 0.36, 1);
	}
	/* The opponent lunges toward the centre of the stage. */
	@keyframes lungeLeft {
		0% {
			transform: translateX(0) scale(1);
		}
		30% {
			transform: translateX(-30px) scale(1.05) rotate(-2deg);
		}
		100% {
			transform: translateX(0) scale(1);
		}
	}
	.fighter-col-opp .fx-lunge {
		animation: lungeLeft 0.8s cubic-bezier(0.22, 1, 0.36, 1);
	}

	@keyframes hitShake {
		0%,
		100% {
			transform: translateX(0);
			filter: none;
		}
		15% {
			transform: translateX(-7px) rotate(-2deg);
			filter: brightness(1.5) saturate(1.3);
		}
		30% {
			transform: translateX(6px) rotate(2deg);
		}
		45% {
			transform: translateX(-4px);
		}
		60% {
			transform: translateX(3px);
			filter: brightness(1.25);
		}
	}
	.fx-hit {
		animation: hitShake 0.7s ease-out;
	}

	@keyframes guardGlow {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.04);
		}
	}
	.fx-guard {
		animation: guardGlow 1s ease-in-out;
	}

	@keyframes dodgeShift {
		0% {
			transform: translateX(0);
			opacity: 1;
		}
		25% {
			transform: translateX(50px) translateY(-12px);
			opacity: 0.55;
		}
		60% {
			transform: translateX(50px) translateY(-12px);
			opacity: 0.55;
		}
		100% {
			transform: translateX(0);
			opacity: 1;
		}
	}
	.fx-dodge {
		animation: dodgeShift 0.9s ease-in-out;
	}

	@keyframes abilityBurst {
		0% {
			transform: scale(1);
		}
		35% {
			transform: scale(1.12);
			filter: brightness(1.4) saturate(1.5);
		}
		100% {
			transform: scale(1);
		}
	}
	.fx-ability {
		animation: abilityBurst 0.9s ease-out;
	}

	.guard-flash {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #0ea5e9;
		background: rgba(14, 165, 233, 0.14);
		border: 2px solid rgba(14, 165, 233, 0.5);
		border-radius: 10px;
		pointer-events: none;
		animation: guardFlashPulse 1.1s infinite ease-in-out;
	}
	@keyframes guardFlashPulse {
		0%,
		100% {
			opacity: 0.85;
		}
		50% {
			opacity: 0.4;
		}
	}

	.fighter-bars {
		width: 100%;
		margin-top: 0.6rem;
	}
	.stat-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}
	.stat-bar-label {
		font-size: 0.6rem;
		font-weight: 800;
		color: #6b7280;
		width: 2.7rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.stat-bar-track {
		flex: 1;
		height: 9px;
		background: #f3f4f6;
		border: 1px solid #e5e7eb;
		border-radius: 999px;
		overflow: hidden;
	}
	.stat-bar-fill {
		height: 100%;
		border-radius: 999px;
		transition: width 0.65s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.stat-bar-value {
		font-size: 0.62rem;
		font-weight: 800;
		color: #6b7280;
		white-space: nowrap;
	}

	.fighter-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.45rem;
		justify-content: center;
		min-height: 1.1rem;
	}
	.guard-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.6rem;
		font-weight: 800;
		/* color: #0c4a6e;
		background: #e0f2fe;
		border: 1px solid #bae6fd;
		border-radius: 999px; */
		padding: 0.1rem 0.55rem;
		animation: guardPulse 1.4s infinite ease-in-out;
	}
	.danger-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.6rem;
		font-weight: 800;
		/* color: #991b1b;
		background: #fee2e2;
		border: 1px solid #fecaca;
		border-radius: 999px; */
		padding: 0.1rem 0.55rem;
	}
	.danger-chip-pulse {
		animation: guardPulse 1.2s infinite ease-in-out;
	}
	@keyframes guardPulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.55;
		}
	}

	.combo-pips {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		margin-top: 0.5rem;
	}
	.combo-label {
		font-size: 0.58rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #9ca3af;
		margin-right: 0.1rem;
	}
	.pip {
		width: 9px;
		height: 9px;
		border-radius: 999px;
		background: #e5e7eb;
		border: 1px solid #d1d5db;
		transition: background 0.3s ease;
	}
	.pip-filled {
		background: #a2574f;
		border-color: #a2574f;
	}
	.combo-status {
		font-size: 0.56rem;
		font-weight: 800;
		color: #9ca3af;
	}
	.combo-ready .combo-status {
		color: #a2574f;
	}

	/* ---------- Center column ---------- */
	.arena-center {
		flex: 0 1 26%;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.8rem;
		padding-top: 1.6rem;
		position: relative;
		z-index: 1;
	}
	.vs-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		font-size: 1.1rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		color: #a2574f;
		background: #ffffff;
		border: 2px solid #a2574f;
		border-radius: 9999px;
		box-shadow: 0 2px 8px rgba(162, 87, 79, 0.25);
	}
	.telegraph-box {
		width: 100%;
		text-align: center;
		background: #fff7ed;
		border: 1px solid #fed7aa;
		border-radius: 10px;
		padding: 0.6rem 0.5rem;
	}
	.telegraph-sudden {
		border-color: #fecaca;
		background: #fef2f2;
		animation: suddenPulse 1s infinite ease-in-out;
	}
	@keyframes suddenPulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
		}
		50% {
			box-shadow: 0 0 14px 2px rgba(239, 68, 68, 0.3);
		}
	}
	.telegraph-text {
		font-size: 0.72rem;
		font-weight: 800;
		color: #1f2937;
		line-height: 1.3;
	}
	.telegraph-prompt {
		font-size: 0.62rem;
		font-weight: 700;
		color: #6b7280;
		margin-top: 0.3rem;
	}

	/* ---------- Battle log ---------- */
	.battle-log {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		max-height: 8.5rem;
		overflow-y: auto;
		background: #fafafa;
		border: 1px solid #f3f4f6;
		border-radius: 8px;
		padding: 0.5rem 0.75rem;
	}
	.log-entry {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.78rem;
		font-weight: 600;
		color: #6b7280;
		animation: logIn 0.3s ease-out;
	}
	.log-mine {
		color: #1f2937;
	}
	.log-pending {
		color: #9ca3af;
	}
	.log-dot {
		width: 6px;
		height: 6px;
		flex-shrink: 0;
		border-radius: 999px;
		background: #a2574f;
	}
	.log-mine .log-dot {
		background: #22c55e;
	}
	@keyframes logIn {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ---------- Move buttons ---------- */
	.move-btn {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.75rem 0.5rem;
		background: #ffffff;
		border: 2px solid var(--mc, #a2574f);
		border-radius: 10px;
		font-weight: 700;
		color: #1f2937;
		cursor: pointer;
		transition:
			transform 0.12s ease,
			box-shadow 0.12s ease,
			background 0.12s ease;
	}
	.move-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
		background: color-mix(in srgb, var(--mc, #a2574f) 8%, #ffffff);
	}
	.move-btn:active:not(:disabled) {
		transform: translateY(0);
	}
	.move-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.move-btn-disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.move-name {
		font-size: 0.82rem;
		line-height: 1.15;
		text-align: center;
	}
	.move-dmg {
		font-size: 0.66rem;
		font-weight: 800;
		color: #6b7280;
		background: #f3f4f6;
		border-radius: 999px;
		padding: 0.05rem 0.6rem;
		white-space: nowrap;
	}
	.move-cost {
		font-size: 0.62rem;
		font-weight: 800;
		color: #b45309;
	}
	.cd-badge {
		color: #9ca3af;
		background: #f3f4f6;
		border-radius: 999px;
		padding: 0.05rem 0.55rem;
	}

	/* ---------- Turn indicator + attack key-sequence minigame ---------- */
	.turn-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: #e5e7eb;
		display: inline-block;
		flex-shrink: 0;
	}
	.turn-dot-live {
		background: #22c55e;
		animation: turnPulse 1.3s infinite ease-out;
	}
	@keyframes turnPulse {
		0% {
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45);
		}
		70% {
			box-shadow: 0 0 0 7px rgba(34, 197, 94, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
		}
	}

	.seq-overlay {
		position: absolute;
		inset: 0;
		z-index: 40;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(3px);
	}
	.seq-card {
		width: 100%;
		max-width: 340px;
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		box-shadow: 0 14px 36px rgba(0, 0, 0, 0.14);
		padding: 1.1rem 1.25rem 1.2rem;
		text-align: center;
	}
	.seq-title {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #6b7280;
	}
	.seq-bar-track {
		height: 6px;
		background: #f3f4f6;
		border: 1px solid #e5e7eb;
		border-radius: 999px;
		overflow: hidden;
		margin: 0.6rem 0 0.9rem;
	}
	.seq-bar-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #a2574f, #f59e0b);
		transition: width 0.06s linear;
	}
	.seq-bar-critical {
		background: #dc2626;
		animation: guardPulse 0.45s infinite ease-in-out;
	}
	.seq-keys {
		display: flex;
		gap: 0.55rem;
		justify-content: center;
	}
	.seq-key {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 1.2rem;
		font-weight: 800;
		color: #1f2937;
		background: #ffffff;
		border: 2px solid #d1d5db;
		border-radius: 10px;
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
		transition:
			transform 0.12s ease,
			box-shadow 0.12s ease,
			background 0.12s ease,
			border-color 0.12s ease,
			color 0.12s ease;
	}
	.seq-key-next {
		border-color: #a2574f;
		color: #a2574f;
		transform: translateY(-3px);
		box-shadow: 0 4px 0 rgba(162, 87, 79, 0.35);
		animation: seqNextPulse 0.7s infinite ease-in-out;
	}
	@keyframes seqNextPulse {
		0%,
		100% {
			transform: translateY(-3px) scale(1);
		}
		50% {
			transform: translateY(-3px) scale(1.1);
		}
	}
	.seq-key-done {
		background: #dcfce7;
		border-color: #22c55e;
		color: #15803d;
		transform: none;
		box-shadow: none;
		animation: none;
	}
	.seq-shake {
		animation: seqShake 0.25s ease-in-out;
	}
	@keyframes seqShake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-6px);
		}
		50% {
			transform: translateX(6px);
		}
		75% {
			transform: translateX(-4px);
		}
	}
	.seq-hint {
		margin-top: 0.8rem;
		font-size: 0.66rem;
		font-weight: 700;
		color: #9ca3af;
	}
	.seq-miss {
		color: #dc2626;
	}
	.seq-result-banner {
		position: absolute;
		top: 0.6rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 40;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 999px;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
		padding: 0.35rem 0.9rem;
		animation: seqBannerPop 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	}
	@keyframes seqBannerPop {
		0% {
			transform: translateX(-50%) scale(0.6);
			opacity: 0;
		}
		60% {
			transform: translateX(-50%) scale(1.08);
			opacity: 1;
		}
		100% {
			transform: translateX(-50%) scale(1);
		}
	}
	.seq-result-label {
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0.06em;
	}
	.seq-result-mult {
		font-size: 0.72rem;
		font-weight: 800;
		padding: 0.1rem 0.6rem;
		border-radius: 999px;
		background: #f3f4f6;
		color: #6b7280;
	}
	.seq-result-perfect {
		color: #16a34a;
	}
	.seq-result-good {
		color: #0284c7;
	}
	.seq-result-sloppy {
		color: #d97706;
	}
	.seq-result-whiffed {
		color: #dc2626;
	}
	.seq-mult-perfect {
		background: #dcfce7;
		color: #15803d;
	}
	.seq-mult-good {
		background: #e0f2fe;
		color: #0369a1;
	}
	.seq-mult-sloppy {
		background: #fef3c7;
		color: #b45309;
	}
	.seq-mult-whiffed {
		background: #fee2e2;
		color: #b91c1c;
	}

	/* ---------- Damage floats ---------- */
	.damage-float {
		position: absolute;
		left: 50%;
		top: 38%;
		transform: translate(-50%, -50%);
		font-weight: 800;
		font-size: 1.4rem;
		pointer-events: none;
		z-index: 5;
		animation: floatUp 0.9s ease-out forwards;
	}
	.damage-float-dealt {
		color: #d97706;
		text-shadow:
			0 1px 2px rgba(0, 0, 0, 0.35),
			0 0 10px rgba(217, 119, 6, 0.45);
	}
	.damage-float-taken {
		color: #dc2626;
		text-shadow:
			0 1px 2px rgba(0, 0, 0, 0.35),
			0 0 10px rgba(220, 38, 38, 0.45);
	}
	@keyframes floatUp {
		0% {
			opacity: 0;
			transform: translate(-50%, -20%) scale(0.6);
		}
		15% {
			opacity: 1;
			transform: translate(-50%, -55%) scale(1.2);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -150%) scale(1);
		}
	}

	/* ---------- Tips ---------- */
	.tips-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1rem;
		justify-content: center;
		border-top: 1px dashed #e5e7eb;
		padding-top: 0.7rem;
	}
	.tip {
		font-size: 0.66rem;
		font-weight: 700;
		color: #9ca3af;
	}

	.reward-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.85rem;
		font-weight: 800;
		color: #166534;
		background: #dcfce7;
		border: 1px solid #bbf7d0;
		border-radius: 999px;
		padding: 0.35rem 0.9rem;
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
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
		padding: 1.75rem;
		width: 100%;
		max-width: 420px;
	}

	@media (max-width: 768px) {
		.arena-stage {
			flex-direction: column;
			align-items: center;
			gap: 1.25rem;
			min-height: 0;
		}
		.fighter-col {
			flex: none;
			width: 100%;
			max-width: 280px;
		}
		.arena-center {
			padding-top: 0;
			width: 100%;
		}
		.vs-badge {
			display: none;
		}
	}
</style>
