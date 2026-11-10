<script lang="ts">
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const statusText = {
		none: 'Noch nicht eingerichtet',
		pending: 'Einrichtung nicht abgeschlossen',
		active: 'Aktiv',
		restricted: 'Von Stripe abgelehnt'
	} as const;
	const returned = $derived(page.url.searchParams.has('zurueck'));
	const button = 'rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700';
</script>

<svelte:head><title>Auszahlungen – RepairHub</title></svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<a href="/profil" class="text-sm text-emerald-700 hover:underline">← Profil</a>
	<h1 class="text-2xl font-bold">Auszahlungen</h1>

	<section class="space-y-4 rounded-lg border border-stone-200 bg-white p-6">
		<p class="text-stone-700">
			Damit wir dir Geld für Reparaturen überweisen können, brauchst du ein Auszahlungskonto bei
			unserem Zahlungsdienstleister Stripe. Kunden bezahlen an RepairHub; sobald sie die Reparatur
			bestätigen, überweisen wir dir den Preis abzüglich Provision.
		</p>
		{#if !data.payoutAccountRequired}
			<p class="rounded-md bg-stone-100 p-3 text-sm text-stone-700">
				Im Testbetrieb kannst du auch ohne Auszahlungskonto Angebote abgeben und die ganze App
				ausprobieren.
			</p>
		{/if}

		{#if !data.stripeEnabled}
			<p class="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
				Zahlungen sind auf diesem Server noch nicht eingerichtet (STRIPE_SECRET_KEY fehlt).
			</p>
		{:else}
			<div class="flex items-center gap-3">
				<span class="text-sm text-stone-500">Status:</span>
				<span
					class="rounded-full px-3 py-0.5 text-sm font-medium {data.status === 'active'
						? 'bg-emerald-100 text-emerald-800'
						: 'bg-amber-100 text-amber-800'}"
				>
					{statusText[data.status]}
				</span>
			</div>

			{#if data.status === 'active'}
				{#if returned}
					<p class="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
						Fertig! Du kannst jetzt Angebote abgeben.
					</p>
				{/if}
				<form method="post" action="?/dashboard">
					<button
						class="rounded-md border border-stone-300 px-4 py-2 font-medium hover:border-emerald-500"
					>
						Stripe-Dashboard öffnen
					</button>
				</form>
				<p class="text-xs text-stone-500">
					Dort siehst du Auszahlungen und änderst dein Bankkonto.
				</p>
			{:else}
				{#if returned}
					<p class="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
						Stripe braucht noch Angaben von dir. Setze die Einrichtung fort, wo du aufgehört hast.
					</p>
				{/if}
				<form method="post" action="?/start">
					<button class={button}>
						{data.hasAccount ? 'Einrichtung fortsetzen' : 'Auszahlungen einrichten'}
					</button>
				</form>
				<p class="text-xs text-stone-500">
					Du wirst zu Stripe weitergeleitet und kommst danach hierher zurück. Im Testbetrieb kannst
					du Testdaten verwenden, es wird kein echtes Geld bewegt.
				</p>
			{/if}
		{/if}

		{#if form?.message}
			<p class="rounded-md bg-red-50 p-3 text-sm text-red-700">{form.message}</p>
		{/if}
	</section>
</div>
