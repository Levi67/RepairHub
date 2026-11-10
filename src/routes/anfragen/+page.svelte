<script lang="ts">
	import { page } from '$app/state';
	import RequestCard from '#lib/components/RequestCard.svelte';
	import RequestMap from '#lib/components/RequestMap.svelte';
	import { RADIUS_OPTIONS } from '#lib/geo.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** The same search in the other view. */
	function viewUrl(view: 'liste' | 'karte') {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a throwaway copy for building a link
		const params = new URLSearchParams(page.url.search);
		if (view === 'karte') params.set('ansicht', 'karte');
		else params.delete('ansicht');
		const query = params.toString();
		return query ? `?${query}` : page.url.pathname;
	}

	const withoutLocation = $derived(data.requests.filter((r) => r.lat === null).length);
</script>

<svelte:head><title>Reparaturanfragen – RepairHub</title></svelte:head>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-2xl font-bold">Reparaturanfragen</h1>
	<nav class="flex rounded-md border border-stone-300 bg-white p-0.5 text-sm" aria-label="Ansicht">
		{#each [['liste', 'Liste'], ['karte', 'Karte']] as const as [view, label] (view)}
			<a
				href={viewUrl(view)}
				aria-current={data.view === view ? 'page' : undefined}
				data-sveltekit-noscroll
				class="rounded px-3 py-1 font-medium {data.view === view
					? 'bg-emerald-600 text-white'
					: 'text-stone-600 hover:text-stone-900'}"
			>
				{label}
			</a>
		{/each}
	</nav>
</div>

<form method="get" class="mb-6 space-y-2" data-sveltekit-keepfocus data-sveltekit-noscroll>
	{#if data.view === 'karte'}<input type="hidden" name="ansicht" value="karte" />{/if}
	<div class="flex flex-wrap gap-2">
		<input
			type="search"
			name="q"
			value={data.filters.q}
			placeholder="Suchen, z. B. Display, Reißverschluss …"
			class="min-w-0 flex-1 rounded-md border-stone-300"
		/>
		<select name="kategorie" value={data.filters.categorySlug} class="rounded-md border-stone-300">
			<option value="">Alle Kategorien</option>
			{#each data.categories as cat (cat.id)}
				<option value={cat.slug}>{cat.name}</option>
				{#each cat.children as child (child.id)}
					<option value={child.slug}>&nbsp;&nbsp;{child.name}</option>
				{/each}
			{/each}
		</select>
	</div>
	<div class="flex flex-wrap items-center gap-2">
		<input
			name="plz"
			value={data.filters.plz}
			inputmode="numeric"
			pattern={'[0-9]{5}'}
			maxlength="5"
			placeholder="PLZ"
			aria-label="PLZ"
			class="w-24 rounded-md border-stone-300"
		/>
		<select
			name="umkreis"
			value={data.filters.radiusKm ?? ''}
			aria-label="Umkreis"
			class="rounded-md border-stone-300"
		>
			<option value="">Überall</option>
			{#each RADIUS_OPTIONS as km (km)}
				<option value={km}>Umkreis {km} km</option>
			{/each}
		</select>
		<label class="flex items-center gap-2 text-sm text-stone-600">
			<input
				type="checkbox"
				name="versand"
				value="nein"
				checked={!data.filters.includeShipping}
				class="rounded border-stone-300 text-emerald-600"
			/>
			Versand-Anfragen außerhalb ausblenden
		</label>
		<button
			class="ml-auto rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
		>
			Filtern
		</button>
	</div>
	{#if data.locationError}
		<p class="text-sm text-red-600">{data.locationError}</p>
	{:else if data.origin}
		<p class="text-xs text-stone-500">
			Entfernungen ab {data.origin.plz}
			{data.origin.city} (Mitte der PLZ).
			{#if data.filters.radiusKm && data.filters.includeShipping}
				Anfragen mit Versand werden auch von weiter weg angezeigt.
			{/if}
		</p>
	{/if}
</form>

{#if data.view === 'karte'}
	<RequestMap requests={data.requests} origin={data.origin} radiusKm={data.filters.radiusKm} />
	<p class="mt-2 text-sm text-stone-500">
		{data.requests.length === 0
			? 'Keine passenden Anfragen gefunden.'
			: `${data.requests.length} ${data.requests.length === 1 ? 'Anfrage' : 'Anfragen'}`}
		{#if withoutLocation}
			· {withoutLocation} ohne Ortsangabe nicht auf der Karte
		{/if}
		· Positionen sind ungefähr (Mitte der PLZ).
	</p>
{:else if data.requests.length}
	<div class="grid gap-3 sm:grid-cols-2">
		{#each data.requests as request (request.id)}
			<RequestCard {request} />
		{/each}
	</div>
{:else}
	<p class="text-stone-500">Keine passenden Anfragen gefunden.</p>
{/if}
