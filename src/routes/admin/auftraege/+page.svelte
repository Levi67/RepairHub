<script lang="ts">
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { formatCents } from '#lib/money.ts';
	import { orderStatusLabels } from '#lib/status.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Aufträge – Admin – RepairHub</title></svelte:head>

<h1 class="text-3xl font-semibold tracking-tight">Aufträge</h1>

<form method="get" class="mt-4 flex gap-2">
	<select name="status" value={data.status ?? ''} class="rounded-md border-edge text-sm">
		<option value="">Alle Status</option>
		{#each Object.entries(orderStatusLabels) as [value, label] (value)}
			<option {value}>{label}</option>
		{/each}
	</select>
	<button
		class="rounded-md bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-300"
	>
		Filtern
	</button>
</form>

<ul class="mt-4 divide-y divide-edge rounded-xl bg-surface">
	{#each data.orders as o (o.id)}
		<li>
			<a
				href="/admin/auftraege/{o.id}"
				class="flex flex-wrap items-center gap-4 p-4 hover:bg-raised"
			>
				<div class="min-w-0 flex-1">
					<div class="font-medium">{o.title}</div>
					<div class="text-sm text-neutral-400">
						{o.customerName} → {o.repairerName} · {o.createdAt.toLocaleDateString('de-DE')}
						{#if !o.viaStripe}· ohne Stripe{/if}
					</div>
				</div>
				<span class="text-sm font-semibold tabular-nums">{formatCents(o.priceCents)}</span>
				<StatusBadge status={o.status} label={orderStatusLabels[o.status]} />
			</a>
		</li>
	{:else}
		<li class="p-4 text-sm text-neutral-400">Keine Aufträge gefunden.</li>
	{/each}
</ul>
