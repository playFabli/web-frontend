<script>
	/**
	 * @component TexturePreview
	 * Uploads the texture to the backend Blender renderer and shows the 3D rendered preview.
	 */
	import { config } from '$lib/config';

	let { textureFile, categoryId, token } = $props();

	let previewUrl = $state(null);
	let loading = $state(false);
	let error = $state('');

	// When textureFile changes, trigger a render preview
	$effect(() => {
		if (textureFile && categoryId && token) {
			generatePreview();
		} else {
			previewUrl = null;
		}
	});

	async function generatePreview() {
		if (!textureFile || !categoryId || !token) return;

		loading = true;
		error = '';
		previewUrl = null;

		try {
			const formData = new FormData();
			formData.append('category_id', String(categoryId));
			formData.append('texture', textureFile);

			let response = await fetch(`${config.api}/marketplace/item/preview-render`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: formData
			});

			let json = await response.json();
			if (!response.ok) {
				error = json?.message || json?.error || 'Failed to generate preview.';
				return;
			}

			if (json.data?.preview_url) {
				previewUrl = `${config.storage}/items/previews/${json.data.hash}.png`;
			}
		} catch (err) {
			console.error('Failed to generate preview.', err);
			error = 'Failed to generate preview.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="preview-container">
	<h3 class="text-sm font-bold text-gray-700 mb-2">Preview</h3>
	<div class="preview-frame">
		{#if loading}
			<div class="loading-state">
				<img src={`${config.storage}/loading.gif?r=5`} class="h-8 w-8" alt="">
				<p class="text-sm text-gray-500 mt-2">Rendering preview...</p>
			</div>
		{:else if previewUrl}
			<img
				src={previewUrl}
				alt="3D render preview"
				class="preview-image"
			/>
		{:else if error}
			<div class="error-state">
				<p class="text-sm text-red-600">{error}</p>
			</div>
		{:else}
			<div class="no-texture">
				<p class="text-sm text-gray-400">Upload a texture to see 3D preview</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.preview-container {
		width: 100%;
	}
	.preview-frame {
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		background: #f9fafb;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 300px;
	}
	.preview-image {
		display: block;
		max-width: 100%;
		height: auto;
		object-fit: contain;
	}
	.loading-state,
	.error-state,
	.no-texture {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		gap: 0.5rem;
		text-align: center;
	}
	.animate-spin {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>