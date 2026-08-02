<script lang="ts">
	import { page } from "$app/state";
	import { config } from "$lib/config";

	// Currency packs - edit these values directly in the code
	const currencyPacks = [
		{ name: 'Starter', amount: 500, bonus: 0, price: 5.00, bestValue: false },
		{ name: 'Popular', amount: 1000, bonus: 50, price: 9.99, bestValue: false },
		{ name: 'Premium', amount: 2500, bonus: 200, price: 19.99, bestValue: true },
		{ name: 'Ultimate', amount: 5000, bonus: 500, price: 39.99, bestValue: false }
	];

	let loading = $state(false);

	async function purchase(pack: { name: string, amount: number, bonus: number, price: number }) {
		try {
			loading = true;			
			const res = await fetch(`${config.api}/user/payments/invoice`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${page.data.token}`
				},
				body: JSON.stringify({ amount: pack.price })
			});

			const json = await res.json();
			
			if (res.ok) {
				loading = false;			
				window.open(json.data.paymentUrl, '_blank');
			}
		} catch (e) {
			console.error('Failed to create invoice');
		} finally {
			loading = false;
		}
	}

	function formatPrice(price: number) {
		return `$${price.toFixed(2)}`;
	}
</script>

<style>
	.currency-pack {
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		padding: 1rem;
		text-align: center;
		background: white;
		transition: box-shadow 0.15s ease;
	}
	.currency-pack:hover {
		box-shadow: 0 4px 8px rgba(0,0,0,0.07);
	}
	.currency-pack.best-value {
		border-color: #f59e0b;
		position: relative;
	}
	.best-value-badge {
		position: absolute;
		top: -8px;
		right: -8px;
		background: #f59e0b;
		color: #fff;
		font-size: 0.65rem;
		font-weight: 700;
		padding: 0.15rem 0.5rem;
		border-radius: 3px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.1);
	}
	.pro-benefit {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #374151;
		margin-bottom: 0.5rem;
	}
	.pro-benefit::before {
		content: '✓';
		color: #16a34a;
		font-weight: 700;
		font-size: 0.9rem;
	}
</style>

<main class="py-6">
	<div class="max-w-[70%] mx-auto px-4">
		<h1 class="text-xl font-bold text-gray-900 mb-5">Buy Currency</h1>

		<!-- Currency Packs Section -->
		<div class="mb-6">
			<h2 class="text-lg font-semibold mb-3">Coin Packs</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{#each currencyPacks as pack}
					<div class="currency-pack {pack.bestValue ? 'best-value' : ''}">
						{#if pack.bestValue}
							<span class="best-value-badge">BEST VALUE</span>
						{/if}
						<p class="text-xs font-medium text-gray-500 uppercase tracking-wide">{pack.name}</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">{pack.amount.toLocaleString()}</p>
						<p class="text-sm text-gray-600">coins</p>
						{#if pack.bonus > 0}
							<p class="text-xs text-green-600 font-medium">+{pack.bonus} bonus</p>
						{/if}
						<p class="text-primary font-semibold mt-2">{formatPrice(pack.price)}</p>
						<button disabled={loading} onclick={()=>purchase(pack)} class="btn-glossy w-full mt-3 py-2 text-xs">
							{#if loading}
								Loading...
							{:else}
								Buy
							{/if}
						</button>
					</div>
				{/each}
			</div>
		</div>

		<!-- Pro Membership Section -->
		<!-- <div>
			<h2 class="text-lg font-semibold mb-3">pro Membership</h2>
			<div class="border border-[#EFE6E2] rounded-lg p-4 bg-white flex flex-col lg:flex-row gap-4">
				<div class="flex-1">
					<div class="flex items-center gap-2 mb-3">
						<span class="text-xl font-bold text-gray-900">pro</span>
						<span class="text-sm text-gray-600">$8.99 / month</span>
					</div>
					<div class="space-y-1">
						<div class="pro-benefit">+20 more daily currency</div>
						<div class="pro-benefit">Unique badges to stand out</div>
						<div class="pro-benefit">Exclusive items only for pro members</div>
						<div class="pro-benefit">Early announcements on limited drops</div>
						<div class="pro-benefit">Priority access to new features</div>
						<div class="pro-benefit">Custom profile backgrounds</div>
						<div class="pro-benefit">And more!</div>
					</div>
				</div>
				<div class="lg:w-48 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-[#EFE6E2] pt-4 lg:pt-0 lg:pl-4">
					<p class="text-lg font-bold text-gray-900 mb-1">$8.99<span class="text-sm font-normal text-gray-500">/mo</span></p>
					<p class="text-xs text-gray-600 mb-3">Cancel anytime</p>
					<button class="btn-glossy w-full py-2 text-sm">Subscribe Now</button>
				</div>
			</div>
		</div> -->
	</div>
</main>