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
	const button =
		'rounded-md bg-emerald-400 px-3 py-2 font-semibold text-neutral-950 hover:bg-emerald-300';
</script>

<svelte:head><title>Auszahlungen – RepairHub</title></svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
	<a href="/profil" class="text-sm text-emerald-400 hover:underline">← Profil</a>
	<h1 class="text-3xl font-semibold tracking-tight">Auszahlungen</h1>

	<section class="space-y-4 rounded-xl bg-surface p-6">
		<p class="text-neutral-200">
			Damit wir dir Geld für Reparaturen überweisen können, brauchst du ein Auszahlungskonto bei
			unserem Zahlungsdienstleister Stripe. Kunden bezahlen an RepairHub; sobald sie die Reparatur
			bestätigen, überweisen wir dir den Preis abzüglich Provision.
		</p>
		{#if !data.payoutAccountRequired}
			<p class="rounded-md bg-raised p-3 text-sm text-neutral-200">
				Im Testbetrieb kannst du auch ohne Auszahlungskonto Angebote abgeben und die ganze App
				ausprobieren.
			</p>
		{/if}

		{#if !data.stripeEnabled}
			<p class="rounded-md bg-amber-400/10 p-3 text-sm text-amber-300">
				Zahlungen sind auf diesem Server noch nicht eingerichtet (STRIPE_SECRET_KEY fehlt).
			</p>
		{:else}
			<div class="flex items-center gap-3">
				<span class="text-sm text-neutral-400">Status:</span>
				<span
					class="rounded-sm px-3 py-0.5 text-sm font-medium {data.status === 'active'
						? 'bg-emerald-400/10 text-emerald-300'
						: 'bg-amber-400/15 text-amber-300'}"
				>
					{statusText[data.status]}
				</span>
			</div>

			{#if data.status === 'active'}
				{#if returned}
					<p class="rounded-md bg-emerald-400/10 p-3 text-sm text-emerald-300">
						Fertig! Du kannst jetzt Angebote abgeben.
					</p>
				{/if}
				<form method="post" action="?/dashboard">
					<button class="rounded-md bg-raised px-3 py-2 font-semibold hover:bg-edge">
						Stripe-Dashboard öffnen
					</button>
				</form>
				<p class="text-xs text-neutral-400">
					Dort siehst du Auszahlungen und änderst dein Bankkonto.
				</p>
			{:else}
				{#if returned}
					<p class="rounded-md bg-amber-400/10 p-3 text-sm text-amber-300">
						Stripe braucht noch Angaben von dir. Setze die Einrichtung fort, wo du aufgehört hast.
					</p>
				{/if}
				<form method="post" action="?/start">
					<button class={button}>
						{data.hasAccount ? 'Einrichtung fortsetzen' : 'Auszahlungen einrichten'}
					</button>
				</form>
				<p class="text-xs text-neutral-400">
					Du wirst zu Stripe weitergeleitet und kommst danach hierher zurück. Im Testbetrieb kannst
					du Testdaten verwenden, es wird kein echtes Geld bewegt.
				</p>
			{/if}
		{/if}

		{#if form?.message}
			<p class="rounded-md bg-red-400/10 p-3 text-sm text-red-400">{form.message}</p>
		{/if}
	</section>
</div>
