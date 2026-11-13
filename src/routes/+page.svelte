<script lang="ts">
	import RequestCard from '#lib/components/RequestCard.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import { reveal } from '#lib/reveal.ts';
	import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
	import Tray from 'phosphor-svelte/lib/Tray';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const steps = [
		{
			title: 'Anfrage erstellen',
			text: 'Beschreibe, was kaputt ist, lade ein paar Fotos hoch und sag uns deine PLZ.'
		},
		{
			title: 'Angebote vergleichen',
			text: 'Reparateure in deiner Nähe schicken dir Preis und Zeitraum. Du entscheidest in Ruhe.'
		},
		{
			title: 'Reparieren lassen',
			text: 'Per Versand, vor Ort oder bei dir zu Hause. Bezahlt wird über RepairHub.'
		}
	];
</script>

<section class="grid gap-12 pt-8 pb-20 lg:grid-cols-[1fr_22rem] lg:items-end lg:pt-16">
	<div class="max-w-[680px]">
		<h1 class="hero-gradient text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
			Reparieren statt wegwerfen.
		</h1>
		<p class="mt-6 max-w-xl text-lg text-neutral-400">
			RepairHub verbindet dich mit Reparateuren in deiner Nähe. Das spart Geld und hält dein Gerät
			ein paar Jahre länger am Leben.
		</p>
		<div class="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
			<a
				href="/anfragen/neu"
				class="flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-base font-semibold text-neutral-950 hover:bg-emerald-300 active:scale-[0.98]"
			>
				Reparatur anfragen
				<ArrowRight size={18} weight="bold" />
			</a>
			<a
				href="/anfragen"
				class="text-base font-semibold text-neutral-300 underline decoration-neutral-600 underline-offset-4 hover:text-neutral-100 hover:decoration-emerald-400"
			>
				Ich kann reparieren
			</a>
		</div>
		<p class="mt-4 text-sm text-neutral-500">
			Kostenlos anfragen. Du zahlst erst, wenn du ein Angebot annimmst.
		</p>
	</div>

	<ol class="space-y-6 lg:-mb-2 lg:border-l lg:border-edge lg:pl-8">
		{#each steps as step, i (step.title)}
			<li use:reveal={i * 80} class="grid grid-cols-[2rem_1fr] gap-x-2">
				<span class="text-sm font-semibold text-emerald-400 tabular-nums">0{i + 1}</span>
				<div>
					<h2 class="font-semibold">{step.title}</h2>
					<p class="mt-1 text-sm text-neutral-400">{step.text}</p>
				</div>
			</li>
		{/each}
	</ol>
</section>

<section use:reveal class="border-t border-edge py-16">
	<h2 class="mb-6 text-2xl font-semibold tracking-tight">Was ist kaputt?</h2>
	<div class="flex flex-wrap gap-2">
		{#each data.categories as cat (cat.id)}
			<a
				href="/anfragen?kategorie={cat.slug}"
				class="rounded-md bg-surface px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-raised hover:text-neutral-100"
			>
				{cat.name}
			</a>
		{/each}
	</div>
</section>

<section use:reveal class="border-t border-edge pt-16">
	<div class="mb-6 flex items-baseline justify-between gap-4">
		<h2 class="text-2xl font-semibold tracking-tight">Neueste Anfragen</h2>
		<a
			href="/anfragen"
			class="flex items-center gap-1 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
		>
			Alle ansehen <ArrowRight size={14} weight="bold" />
		</a>
	</div>
	{#if data.latest.length}
		<div class="grid gap-3 md:grid-cols-2">
			{#each data.latest as request (request.id)}
				<RequestCard {request} />
			{/each}
		</div>
	{:else}
		<EmptyState
			icon={Tray}
			title="Noch keine Anfragen"
			text="Hier erscheinen die neuesten Reparaturanfragen aus deiner Umgebung. Fang einfach mit deiner an."
			action={{ href: '/anfragen/neu', label: 'Erste Anfrage erstellen' }}
		/>
	{/if}
</section>
