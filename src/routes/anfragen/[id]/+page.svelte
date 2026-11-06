<script lang="ts">
	import { formatCents } from '#lib/money.ts';
	import { handoverLabels } from '#lib/handover.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const request = $derived(data.request);
</script>

<svelte:head><title>{request.title} – RepairHub</title></svelte:head>

<a href="/anfragen" class="text-sm text-emerald-700 hover:underline">← Alle Anfragen</a>

<article class="mt-4 rounded-lg border border-stone-200 bg-white p-6">
	<div class="text-xs font-medium tracking-wide text-emerald-700 uppercase">
		{request.categoryName}
	</div>
	<h1 class="mt-1 text-2xl font-bold">{request.title}</h1>
	<p class="mt-1 text-sm text-stone-500">
		von {request.customerName} · {request.createdAt.toLocaleDateString('de-DE')} · {request.plz}
		{request.city}
	</p>

	<p class="mt-6 whitespace-pre-line">{request.description}</p>

	<dl class="mt-6 grid gap-4 border-t border-stone-100 pt-6 text-sm sm:grid-cols-2">
		{#if request.brand || request.model}
			<div>
				<dt class="text-stone-500">Gerät</dt>
				<dd>{[request.brand, request.model].filter(Boolean).join(' ')}</dd>
			</div>
		{/if}
		<div>
			<dt class="text-stone-500">Übergabe</dt>
			<dd>{request.handoverModes.map((m) => handoverLabels[m]).join(', ')}</dd>
		</div>
		<div>
			<dt class="text-stone-500">Budget</dt>
			<dd>
				{request.budgetCents ? `bis ca. ${formatCents(request.budgetCents)}` : 'keine Angabe'}
			</dd>
		</div>
		<div>
			<dt class="text-stone-500">Läuft ab am</dt>
			<dd>{request.expiresAt.toLocaleDateString('de-DE')}</dd>
		</div>
	</dl>
</article>

<div class="mt-4 rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-500">
	{#if data.isOwner}
		Das ist deine Anfrage. Angebote von Reparateuren erscheinen hier, sobald die Angebotsfunktion
		fertig ist.
	{:else}
		Angebote abgeben kommt in einer späteren Version.
	{/if}
</div>
