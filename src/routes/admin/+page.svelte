<script lang="ts">
	import { formatCents } from '#lib/money.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const s = $derived(data.stats);

	const percent = (part: number, total: number) =>
		total ? `${Math.round((part / total) * 100)} %` : '–';
	const perRequest = $derived(
		s.requests.total
			? (s.quotes.total / s.requests.total).toLocaleString('de-DE', { maximumFractionDigits: 1 })
			: '–'
	);

	const tiles = $derived([
		{
			label: 'Nutzer',
			value: s.users.total.toLocaleString('de-DE'),
			note: `+${s.users.newThisWeek} in 7 Tagen`
		},
		{
			label: 'Anfragen',
			value: s.requests.total.toLocaleString('de-DE'),
			note: `${s.requests.open} offen`
		},
		{
			label: 'Aufträge',
			value: s.orders.total.toLocaleString('de-DE'),
			note: `${s.orders.completed} abgeschlossen`
		},
		{
			label: 'Umsatzvolumen (GMV)',
			value: formatCents(s.orders.gmvCents),
			note: 'gebuchte Aufträge'
		},
		{
			label: 'Provision',
			value: formatCents(s.orders.commissionEarnedCents),
			note: `+ ${formatCents(s.orders.commissionPendingCents)} aus laufenden Aufträgen`
		}
	]);

	const weekLabel = (d: Date) =>
		d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
</script>

<svelte:head><title>Admin – RepairHub</title></svelte:head>

<h1 class="text-2xl font-bold">Übersicht</h1>
<p class="mt-1 text-sm text-stone-500">
	Testbetrieb: Beträge stammen aus Aufträgen ohne echte Zahlung.
</p>

<div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
	{#each tiles as tile (tile.label)}
		<div class="rounded-lg border border-stone-200 bg-white p-4">
			<div class="text-sm text-stone-500">{tile.label}</div>
			<div class="mt-1 text-2xl font-bold tabular-nums">{tile.value}</div>
			<div class="mt-1 text-xs text-stone-500">{tile.note}</div>
		</div>
	{/each}
</div>

<div class="mt-8 grid gap-6 md:grid-cols-3">
	<section class="rounded-lg border border-stone-200 bg-white p-4">
		<h2 class="mb-3 font-semibold">Anfragen</h2>
		<dl class="space-y-1 text-sm">
			<div class="flex justify-between">
				<dt>Offen</dt>
				<dd class="tabular-nums">{s.requests.open}</dd>
			</div>
			<div class="flex justify-between">
				<dt>Vergeben</dt>
				<dd class="tabular-nums">{s.requests.assigned}</dd>
			</div>
			<div class="flex justify-between">
				<dt>Abgelaufen</dt>
				<dd class="tabular-nums">{s.requests.expired}</dd>
			</div>
			<div class="flex justify-between">
				<dt>Geschlossen</dt>
				<dd class="tabular-nums">{s.requests.closed}</dd>
			</div>
			<div class="flex justify-between border-t border-stone-100 pt-1">
				<dt>Mit mind. einem Angebot</dt>
				<dd class="tabular-nums">{percent(s.quotes.requestsWithQuote, s.requests.total)}</dd>
			</div>
			<div class="flex justify-between">
				<dt>Mit gebuchtem Auftrag</dt>
				<dd class="tabular-nums">{percent(s.orders.requestsWithOrder, s.requests.total)}</dd>
			</div>
			<div class="flex justify-between">
				<dt>Angebote pro Anfrage</dt>
				<dd class="tabular-nums">{perRequest}</dd>
			</div>
		</dl>
	</section>

	<section class="rounded-lg border border-stone-200 bg-white p-4">
		<h2 class="mb-3 font-semibold">Aufträge</h2>
		<dl class="space-y-1 text-sm">
			<div class="flex justify-between">
				<dt>Laufend</dt>
				<dd class="tabular-nums">{s.orders.running}</dd>
			</div>
			<div class="flex justify-between">
				<dt>Abgeschlossen</dt>
				<dd class="tabular-nums">{s.orders.completed}</dd>
			</div>
			<div class="flex justify-between">
				<dt>Storniert</dt>
				<dd class="tabular-nums">{s.orders.cancelled}</dd>
			</div>
			<div class="flex justify-between border-t border-stone-100 pt-1">
				<dt>Ø Auftragswert</dt>
				<dd class="tabular-nums">
					{s.orders.booked ? formatCents(Math.round(s.orders.gmvCents / s.orders.booked)) : '–'}
				</dd>
			</div>
			<div class="flex justify-between">
				<dt>Angebote gesamt</dt>
				<dd class="tabular-nums">{s.quotes.total}</dd>
			</div>
		</dl>
	</section>

	<section class="rounded-lg border border-stone-200 bg-white p-4">
		<h2 class="mb-3 font-semibold">Nutzer & Chat</h2>
		<dl class="space-y-1 text-sm">
			<div class="flex justify-between">
				<dt>Admins</dt>
				<dd class="tabular-nums">{s.users.admins}</dd>
			</div>
			<div class="flex justify-between">
				<dt>Gesperrt</dt>
				<dd class="tabular-nums">{s.users.banned}</dd>
			</div>
			<div class="flex justify-between border-t border-stone-100 pt-1">
				<dt>Unterhaltungen</dt>
				<dd class="tabular-nums">{s.chat.conversations}</dd>
			</div>
			<div class="flex justify-between">
				<dt>Nachrichten</dt>
				<dd class="tabular-nums">{s.chat.messages}</dd>
			</div>
			<div class="flex justify-between">
				<dt>Davon mit Kontaktdaten markiert</dt>
				<dd class="tabular-nums">{s.chat.flagged}</dd>
			</div>
		</dl>
	</section>
</div>

<section class="mt-8">
	<h2 class="mb-3 text-lg font-semibold">Pro Woche</h2>
	<div class="overflow-x-auto rounded-lg border border-stone-200 bg-white">
		<table class="w-full text-sm">
			<thead class="bg-stone-50 text-left text-stone-500">
				<tr>
					<th class="px-4 py-2 font-medium">Woche ab</th>
					<th class="px-4 py-2 text-right font-medium">Neue Nutzer</th>
					<th class="px-4 py-2 text-right font-medium">Neue Anfragen</th>
					<th class="px-4 py-2 text-right font-medium">Neue Aufträge</th>
					<th class="px-4 py-2 text-right font-medium">GMV</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-stone-100 tabular-nums">
				{#each s.weekly as week (week.weekStart.getTime())}
					<tr>
						<td class="px-4 py-2">{weekLabel(week.weekStart)}</td>
						<td class="px-4 py-2 text-right">{week.users}</td>
						<td class="px-4 py-2 text-right">{week.requests}</td>
						<td class="px-4 py-2 text-right">{week.orders}</td>
						<td class="px-4 py-2 text-right">{formatCents(week.gmvCents)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="mt-2 text-xs text-stone-500">
		GMV = Summe der Auftragspreise aller bezahlten, nicht stornierten Aufträge. Provision zählt erst
		als verdient, wenn der Auftrag abgeschlossen ist.
	</p>
</section>
