<script lang="ts">
	import RequestCard from '#lib/components/RequestCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const steps = [
		{ title: 'Anfrage erstellen', text: 'Beschreibe, was kaputt ist, und wo du wohnst.' },
		{ title: 'Angebote erhalten', text: 'Reparateure in deiner Nähe schicken dir Angebote.' },
		{
			title: 'Reparieren lassen',
			text: 'Wähle ein Angebot – per Versand, vor Ort oder bei dir zu Hause.'
		}
	];
</script>

<section class="py-10 text-center">
	<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">Reparieren statt wegwerfen.</h1>
	<p class="mx-auto mt-4 max-w-xl text-lg text-stone-600">
		RepairHub verbindet dich mit Reparateuren in deiner Nähe – gut für deinen Geldbeutel und für die
		Umwelt.
	</p>
	<div class="mt-8 flex flex-wrap justify-center gap-3">
		<a
			href="/anfragen/neu"
			class="rounded-md bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700"
		>
			Reparatur anfragen
		</a>
		<a
			href="/anfragen"
			class="rounded-md border border-stone-300 bg-white px-5 py-2.5 font-medium hover:border-emerald-500"
		>
			Ich kann reparieren
		</a>
	</div>
</section>

<section class="grid gap-4 sm:grid-cols-3">
	{#each steps as step, i (step.title)}
		<div class="rounded-lg border border-stone-200 bg-white p-5">
			<div class="mb-2 text-sm font-bold text-emerald-700">{i + 1}.</div>
			<h2 class="font-semibold">{step.title}</h2>
			<p class="mt-1 text-sm text-stone-600">{step.text}</p>
		</div>
	{/each}
</section>

<section class="mt-12">
	<h2 class="mb-4 text-xl font-bold">Kategorien</h2>
	<div class="flex flex-wrap gap-2">
		{#each data.categories as cat (cat.id)}
			<a
				href="/anfragen?kategorie={cat.slug}"
				class="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm hover:border-emerald-500"
			>
				{cat.name}
			</a>
		{/each}
	</div>
</section>

<section class="mt-12">
	<div class="mb-4 flex items-baseline justify-between">
		<h2 class="text-xl font-bold">Neueste Anfragen</h2>
		<a href="/anfragen" class="text-sm text-emerald-700 hover:underline">Alle ansehen →</a>
	</div>
	{#if data.latest.length}
		<div class="grid gap-3 sm:grid-cols-2">
			{#each data.latest as request (request.id)}
				<RequestCard {request} />
			{/each}
		</div>
	{:else}
		<p class="text-stone-500">Noch keine Anfragen – erstelle die erste!</p>
	{/if}
</section>
