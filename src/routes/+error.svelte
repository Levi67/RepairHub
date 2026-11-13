<script lang="ts">
	import { page } from '$app/state';
	import Wrench from 'phosphor-svelte/lib/Wrench';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';

	const notFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{notFound ? 'Seite nicht gefunden' : 'Fehler'} – RepairHub</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="max-w-[680px] pt-8 pb-16 lg:pt-16">
	<div class="flex items-center gap-3 text-emerald-400">
		<Wrench size={24} weight="duotone" />
		<span class="text-sm font-semibold tabular-nums">Fehler {page.status}</span>
	</div>
	<h1 class="hero-gradient mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">
		{notFound ? 'Diese Seite gibt es nicht.' : 'Hier ist etwas kaputtgegangen.'}
	</h1>
	<p class="mt-6 text-lg text-neutral-400">
		{#if notFound}
			Vielleicht wurde die Anfrage gelöscht oder der Link ist unvollständig.
		{:else}
			{page.error?.message ?? 'Wir konnten die Seite nicht laden.'} Versuch es in einem Moment noch einmal.
		{/if}
	</p>
	<div class="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
		<a
			href="/anfragen"
			class="flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-base font-semibold text-neutral-950 hover:bg-emerald-300 active:scale-[0.98]"
		>
			Anfragen durchsuchen
			<ArrowRight size={18} weight="bold" />
		</a>
		<a
			href="/"
			class="text-base font-semibold text-neutral-300 underline decoration-neutral-600 underline-offset-4 hover:text-neutral-100 hover:decoration-emerald-400"
		>
			Zur Startseite
		</a>
	</div>
</section>
