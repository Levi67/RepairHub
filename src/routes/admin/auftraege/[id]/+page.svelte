<script lang="ts">
	import { enhance } from '$app/forms';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import FormResult from '#lib/components/admin/FormResult.svelte';
	import OwnPassword from '#lib/components/admin/OwnPassword.svelte';
	import { formatCents } from '#lib/money.ts';
	import { orderStatusLabels } from '#lib/status.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const o = $derived(data.order);
	const button = 'rounded-md px-3 py-2 text-sm font-semibold';
</script>

<svelte:head><title>Auftrag: {data.title} – Admin – RepairHub</title></svelte:head>

<a href="/admin/auftraege" class="text-sm text-emerald-400 hover:underline">← Alle Aufträge</a>

<div class="mt-4 flex flex-wrap items-center gap-3">
	<h1 class="text-3xl font-semibold tracking-tight">{data.title}</h1>
	<StatusBadge status={o.status} label={orderStatusLabels[o.status]} />
	<a href="/admin/anfragen/{o.requestId}" class="ml-auto {button} bg-raised hover:bg-edge"
		>Zur Anfrage</a
	>
</div>

<div class="mt-6"><FormResult {form} /></div>

<div class="mt-6 grid gap-6 lg:grid-cols-2">
	<section class="rounded-xl bg-surface p-6 text-sm">
		<h2 class="mb-3 text-lg font-semibold">Details</h2>
		<dl class="space-y-2">
			<div class="flex justify-between gap-4">
				<dt class="text-neutral-400">Kunde</dt>
				<dd>
					<a href="/admin/nutzer/{o.customerId}" class="hover:underline">{data.customerName}</a>
				</dd>
			</div>
			<div class="flex justify-between gap-4">
				<dt class="text-neutral-400">Reparateur</dt>
				<dd>
					<a href="/admin/nutzer/{o.repairerId}" class="hover:underline">{data.repairerName}</a>
				</dd>
			</div>
			<div class="flex justify-between gap-4">
				<dt class="text-neutral-400">Preis / Provision / Auszahlung</dt>
				<dd class="tabular-nums">
					{formatCents(o.priceCents)} / {formatCents(o.commissionCents)} / {formatCents(
						o.payoutCents
					)}
				</dd>
			</div>
			<div class="flex justify-between gap-4">
				<dt class="text-neutral-400">Stripe</dt>
				<dd>
					{#if !data.stripe.paid}ohne Stripe-Zahlung{:else}
						bezahlt{data.stripe.refunded ? ', erstattet' : ''}{data.stripe.paidOut
							? ', ausgezahlt'
							: ''}
					{/if}
				</dd>
			</div>
		</dl>
	</section>

	<section class="rounded-xl bg-surface p-6 ring-1 ring-amber-400/30">
		<h2 class="text-lg font-semibold">Status erzwingen</h2>
		<p class="mt-1 text-sm text-neutral-400">
			Setzt den Status ohne die normalen Regeln. Die Anfrage wird passend geöffnet oder vergeben.
		</p>
		<form method="post" action="?/force" use:enhance class="mt-4 space-y-3">
			<select name="status" value={o.status} class="w-full max-w-xs rounded-md border-edge">
				{#each Object.entries(orderStatusLabels) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</select>
			{#if data.stripe.paid}
				<label class="flex items-start gap-2 text-sm text-neutral-300">
					<input
						type="checkbox"
						name="withStripe"
						class="mt-0.5 rounded border-edge text-amber-400"
					/>
					<span>
						Auch in Stripe umsetzen: bei „Storniert“ / „Erstattet“ die Zahlung erstatten, bei
						„Abgeschlossen“ an den Reparateur auszahlen.
					</span>
				</label>
			{:else}
				<p class="text-sm text-neutral-400">Ohne Stripe-Zahlung: es wird kein Geld bewegt.</p>
			{/if}
			<OwnPassword />
			<button class="{button} bg-amber-400 text-neutral-950 hover:bg-amber-300"
				>Status setzen</button
			>
		</form>
	</section>
</div>
