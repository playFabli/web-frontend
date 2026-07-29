<script>
	let { children, text } = $props();
	let visible = $state(false);
</script>

<div 
	class="tooltip-wrapper cursor-help" 
	onmouseenter={() => visible = true} 
	onmouseleave={() => visible = false}
	role="pointer"
>
	{@render children()}

	{#if visible}
		<div class="tooltip-box">
			{text}
		</div>
	{/if}
</div>

<style>
	.tooltip-wrapper {
		position: relative;
		display: inline-block;
	}
	.tooltip-box {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-bottom: 8px;
		background-color: #222;
		color: #fff;
		padding: 6px 10px;
		border-radius: 4px;
		font-size: 13px;
		white-space: nowrap;
		z-index: 10;
	}
</style>
