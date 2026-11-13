<script lang="ts">
	import { formatCents } from '#lib/money.ts';
	import { handoverLabels } from '#lib/handover.ts';
	import { orderStatusLabels } from '#lib/status.ts';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const tabs = [
		{ role: 'customer', label: 'Als Auftraggeber' },
		{ role: 'repairer', label: 'Als Reparateur' }
	] as const;
</script>

<svelte:head><title>Meine Aufträge – RepairHub</title></svelte:head>

<h1 class="mb-6 text-3xl font-semibold tracking-tight">Meine Aufträge</h1>

{#each tabs as tab (tab.role)}
	{@const orders = data.orders.filter((o) => o.role === tab.role)}
	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">{tab.label}</h2>
		{#if orders.length}
			<div class="space-y-2">
				{#each orders as o (o.id)}
					<a
						href="/auftraege/{o.id}"
						class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface p-4 hover:bg-raised"
					>
						<div>
							<div class="font-medium">{o.requestTitle}</div>
							<div class="text-sm text-neutral-300">
								{tab.role === 'customer' ? 'Reparateur' : 'Auftraggeber'}: {o.otherPartyName} ·
								{handoverLabels[o.handoverMode]} · {o.createdAt.toLocaleDateString('de-DE')}
							</div>
						</div>
						<div class="flex items-center gap-3">
							{#if o.needsReview}
								<span
									class="rounded-sm bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-300"
								>
									Jetzt bewerten
								</span>
							{/if}
							<span class="font-semibold">{formatCents(o.priceCents)}</span>
							<StatusBadge status={o.status} label={orderStatusLabels[o.status]} />
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<p class="rounded-xl bg-surface px-4 py-6 text-sm text-neutral-400">
				{tab.role === 'customer'
					? 'Sobald du ein Angebot annimmst, erscheint der Auftrag hier.'
					: 'Sobald jemand dein Angebot annimmt, erscheint der Auftrag hier.'}
			</p>
		{/if}
	</section>
{/each}
