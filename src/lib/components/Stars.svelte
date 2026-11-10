<script lang="ts">
	// Star rating for display: "★★★★☆ 4,3 (12)". Without `count` only the stars are shown.
	let {
		rating,
		count,
		emptyText = 'Noch keine Bewertungen'
	}: { rating: number | null; count?: number; emptyText?: string } = $props();

	const rounded = $derived(rating === null ? 0 : Math.round(rating));
	const label = $derived(
		rating === null
			? emptyText
			: `${rating.toLocaleString('de-DE', { maximumFractionDigits: 1 })} von 5 Sternen`
	);
</script>

{#if rating === null || count === 0}
	<span class="text-sm text-stone-400">{emptyText}</span>
{:else}
	<span class="inline-flex items-center gap-1 text-sm" title={label}>
		<span class="tracking-tight text-amber-500" aria-hidden="true">
			{'★'.repeat(rounded)}<span class="text-stone-300">{'★'.repeat(5 - rounded)}</span>
		</span>
		<span class="sr-only">{label}</span>
		{#if count !== undefined}
			<span class="text-stone-600" aria-hidden="true">
				{rating.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
				({count})
			</span>
			<span class="sr-only">, {count} {count === 1 ? 'Bewertung' : 'Bewertungen'}</span>
		{/if}
	</span>
{/if}
