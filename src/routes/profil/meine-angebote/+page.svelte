<script lang="ts">
	import { formatCents } from '#lib/money.ts';
	import { handoverLabels } from '#lib/handover.ts';
	import { quoteStatusLabels } from '#lib/status.ts';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const now = new Date();
</script>

<svelte:head><title>Meine Angebote – RepairHub</title></svelte:head>

<h1 class="mb-6 text-2xl font-bold">Meine Angebote</h1>

{#if data.quotes.length}
	<div class="space-y-2">
		{#each data.quotes as q (q.id)}
			{@const status = q.status === 'pending' && q.validUntil <= now ? 'expired' : q.status}
			<a
				href={q.orderId ? `/auftraege/${q.orderId}` : `/anfragen/${q.requestId}`}
				class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white p-4 hover:border-emerald-400"
			>
				<div>
					<div class="font-medium">{q.requestTitle}</div>
					<div class="text-sm text-stone-600">
						{handoverLabels[q.handoverMode]} · gesendet am {q.createdAt.toLocaleDateString('de-DE')}
					</div>
				</div>
				<div class="flex items-center gap-3">
					<span class="font-semibold">{formatCents(q.priceCents)}</span>
					<StatusBadge {status} label={quoteStatusLabels[status]} />
				</div>
			</a>
		{/each}
	</div>
{:else}
	<p class="text-stone-500">
		Du hast noch keine Angebote abgegeben.
		<a href="/anfragen" class="text-emerald-700 hover:underline">Offene Anfragen ansehen</a>
	</p>
{/if}
