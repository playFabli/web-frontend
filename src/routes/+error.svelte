<script lang="ts">
	import { page } from '$app/state';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
</script>

<svelte:head>
	<title>{page.status} - Fabli</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen flex flex-col bg-white">
	<nav class="bg-white border-b border-[#c7b3a0]/30 sticky top-0 z-50" style="min-height: 44px;">
		<div class="w-full sm:max-w-[70%] mx-auto px-4 flex items-center justify-between" style="min-height: 44px;">
			<div class="flex items-center gap-5">
				<a href="/" class="inline-flex items-baseline font-bold text-gray-900 text-base tracking-tight whitespace-nowrap select-none">
					<img class="inline-block h-[32px]" src="/logo_full.png" alt="Logo">
					<span class="text-sm font-bold text-[#A2574F] ml-1">alpha</span>
				</a>
			</div>
			<div class="flex items-center gap-4 text-sm font-bold">
				<!-- <a href="/" class="text-gray-600 hover:text-[#A2574F] transition-colors duration-200">Home</a>
				<a href="/user/login" class="btn-glossy px-4 py-1">Login</a> -->
			</div>
		</div>
	</nav>

	<main class="flex-1 flex items-center justify-center py-16">
		<div class="max-w-md mx-auto px-4 text-center">
			<div class="border border-[#EFE6E2] rounded-lg p-8 bg-white">
				<div class="w-16 h-16 mx-auto mb-4 text-[#A2574F]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
				</div>

				<div class="text-6xl font-bold text-gray-500 mb-4">{page.status}</div>

				<h1 class="text-xl font-bold text-gray-900 mb-2">
					{#if page.status === 404}
						Page Not Found
					{:else if page.status === 403}
						Access Denied
					{:else if page.status === 500}
						Server Error
					{:else}
						Something Went Wrong
					{/if}
				</h1>

				<p class="text-sm text-gray-600 mb-6">
					{#if page.status === 404}
						The page you're looking for doesn't exist or has been moved.
					{:else if page.status === 403}
						You don't have permission to access this page.
					{:else if page.status === 500}
						An internal server error occurred. Please try again later.
					{:else}
						An unexpected error occurred.
					{/if}
				</p>

				<div class="flex flex-col sm:flex-row items-center justify-center gap-4">
					<a href="/" class="btn-glossy px-5 py-2 text-sm w-full sm:w-auto">
						Return Home
					</a>
				</div>
			</div>
		</div>
	</main>

	<footer class="bg-[#A2574F] border-t-1 border-[#c7b3a0]/50 pt-8 pb-6 mt-12">
		<div class="w-full sm:max-w-[70%] mx-auto px-4">
			<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-[#c7b3a0]/10">
				<div class="flex items-center gap-4">
					<a href="/" class="font-bold text-neutral-100 text-base tracking-tight select-none">
						fabli <span class="text-sm">alpha</span>
					</a>
					<span class="text-neutral-300 text-sm">&copy; 2026</span>
				</div>
			</div>
		</div>
	</footer>
</div>