<script lang="ts">
	let {
		name,
		image = null,
		size = 'md'
	}: { name: string; image?: string | null; size?: 'sm' | 'md' | 'lg' } = $props();

	const sizes = { sm: 'size-7 text-xs', md: 'size-10 text-sm', lg: 'size-24 text-3xl' };

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
	<img src={image} alt="" class="{sizes[size]} shrink-0 rounded-full bg-stone-200 object-cover" />
{:else}
	<span
		class="{sizes[
			size
		]} flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-800"
		aria-hidden="true"
	>
		{initials}
	</span>
{/if}
