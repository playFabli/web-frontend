<script lang="ts">
	import '../layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { SvelteKitTopLoader } from 'sveltekit-top-loader';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<SvelteKitTopLoader color="#b5685f" />
<div class="min-h-screen flex flex-col">
<nav class="bg-white border-b border-[#c7b3a0]/30 sticky top-0 z-50" style="min-height: 44px;">
    <div class="max-w-[70%] mx-auto px-4 flex items-center justify-between flex-wrap gap-y-2" style="min-height: 44px;">

        <div class="flex items-center gap-5 flex-wrap">
            <!-- <a href="/" class="font-bold text-gray-900 text-base tracking-tight whitespace-nowrap select-none">
                <img src="/logo.png" class="inline-block !h-[32px]"> fabli <span class="text-sm font-medium text-[#A2574F]">beta</span>
            </a> -->
			<a href="/" class="inline-flex items-baseline font-bold text-gray-900 text-base tracking-tight whitespace-nowrap select-none">
				<img class="inline-block !h-[32px]" src="/logo_full.png"> 
				<span class="text-sm font-bold text-[#A2574F] ml-1">alpha</span>
			</a>

            <div class="flex items-center gap-4 flex-wrap text-sm text-gray-600 font-medium">

            </div>
        </div>

        <div class="flex items-center gap-4 flex-shrink-0 text-sm font-medium">
            <a href="/user/login" class="text-gray-600 hover:text-[#A2574F] transition-colors duration-200">Login</a>
            <a href="/user/register" class="btn-glossy px-4 py-1">Register</a>
        </div>
    </div>
</nav>


	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="bg-[#A2574F] border-t-1 border-[#c7b3a0]/50 pt-8 pb-6 mt-12">
		<div class="max-w-[70%] mx-auto px-4">
			<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-[#c7b3a0]/10">
				<div class="flex items-center gap-4">
					<a href="/" class="font-bold text-neutral-100 text-base tracking-tight select-none">
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