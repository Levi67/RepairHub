<script lang="ts">
	let {
		name,
		image = null,
		size = 'md'
	}: { name: string; image?: string | null; size?: 'sm' | 'md' | 'lg' } = $props();

	const sizes = {
		sm: 'size-7 rounded-md text-xs',
		md: 'size-10 rounded-lg text-sm',
		lg: 'size-24 rounded-2xl text-3xl'
	};

	const initials = $derived(
		name
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('')
	);
</script>

{#if image}
	<img src={image} alt="" class="{sizes[size]} shrink-0 bg-edge object-cover" />
{:else}
	<span
		class="{sizes[
			size
		]} flex shrink-0 items-center justify-center bg-emerald-400/10 font-semibold text-emerald-300"
		aria-hidden="true"
	>
		{initials}
	</span>
{/if}
