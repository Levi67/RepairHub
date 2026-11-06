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

<h1 class="mb-6 text-2xl font-bold">Meine Aufträge</h1>

{#each tabs as tab (tab.role)}
	{@const orders = data.orders.filter((o) => o.role === tab.role)}
	<section class="mb-8">
		<h2 class="mb-3 text-lg font-semibold">{tab.label}</h2>
		{#if orders.length}
			<div class="space-y-2">
				{#each orders as o (o.id)}
					<a
						href="/auftraege/{o.id}"
						class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white p-4 hover:border-emerald-400"
					>
						<div>
							<div class="font-medium">{o.requestTitle}</div>
							<div class="text-sm text-stone-600">
								{tab.role === 'customer' ? 'Reparateur' : 'Auftraggeber'}: {o.otherPartyName} ·
								{handoverLabels[o.handoverMode]} · {o.createdAt.toLocaleDateString('de-DE')}
							</div>
						</div>
						<div class="flex items-center gap-3">
							<span class="font-semibold">{formatCents(o.priceCents)}</span>
							<StatusBadge status={o.status} label={orderStatusLabels[o.status]} />
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-stone-500">Keine Aufträge.</p>
		{/if}
	</section>
{/each}
