<script lang="ts">
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Hammer from 'phosphor-svelte/lib/Hammer';
	import { formatCents } from '#lib/money.ts';
	import { handoverLabels } from '#lib/handover.ts';
	import { quoteDisplayStatus } from '#lib/status.ts';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const now = new Date();
</script>

<svelte:head><title>Meine Angebote – RepairHub</title></svelte:head>

<h1 class="mb-6 text-3xl font-semibold tracking-tight">Meine Angebote</h1>

{#if data.quotes.length}
	<div class="space-y-2">
		{#each data.quotes as q (q.id)}
			{@const display = quoteDisplayStatus(q, now)}
			<a
				href={q.orderId ? `/auftraege/${q.orderId}` : `/anfragen/${q.requestId}`}
				class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface p-4 hover:bg-raised"
			>
				<div>
					<div class="font-medium">{q.requestTitle}</div>
					<div class="text-sm text-neutral-300">
						{handoverLabels[q.handoverMode]} · gesendet am {q.createdAt.toLocaleDateString('de-DE')}
					</div>
				</div>
				<div class="flex items-center gap-3">
					<span class="font-semibold">{formatCents(q.priceCents)}</span>
					<StatusBadge {...display} />
				</div>
			</a>
		{/each}
	</div>
{:else}
	<EmptyState
		icon={Hammer}
		title="Du hast noch keine Angebote abgegeben"
		text="Stöber durch offene Anfragen in deiner Umgebung und schick ein Angebot mit Preis und Zeitraum."
		action={{ href: '/anfragen', label: 'Offene Anfragen ansehen' }}
	/>
{/if}
