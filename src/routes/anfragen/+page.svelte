<script lang="ts">
	import EmptyState from '#lib/components/EmptyState.svelte';
	import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
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
	<h1 class="text-3xl font-semibold tracking-tight">Reparaturanfragen</h1>
	<nav class="flex rounded-lg bg-surface p-1 text-sm" aria-label="Ansicht">
		{#each [['liste', 'Liste'], ['karte', 'Karte']] as const as [view, label] (view)}
			<a
				href={viewUrl(view)}
				aria-current={data.view === view ? 'page' : undefined}
				data-sveltekit-noscroll
				class="rounded-md px-3 py-1 font-semibold {data.view === view
					? 'bg-raised text-neutral-100'
					: 'text-neutral-300 hover:text-neutral-100'}"
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
			class="min-w-0 flex-1 rounded-md border-edge"
		/>
		<select name="kategorie" value={data.filters.categorySlug} class="rounded-md border-edge">
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
			class="w-24 rounded-md border-edge"
		/>
		<select
			name="umkreis"
			value={data.filters.radiusKm ?? ''}
			aria-label="Umkreis"
			class="rounded-md border-edge"
		>
			<option value="">Überall</option>
			{#each RADIUS_OPTIONS as km (km)}
				<option value={km}>Umkreis {km} km</option>
			{/each}
		</select>
		<label class="flex items-center gap-2 text-sm text-neutral-300">
			<input
				type="checkbox"
				name="versand"
				value="nein"
				checked={!data.filters.includeShipping}
				class="rounded border-edge text-emerald-400"
			/>
			Versand-Anfragen außerhalb ausblenden
		</label>
		<button
			class="ml-auto rounded-md bg-emerald-400 px-3 py-2 font-semibold text-neutral-950 hover:bg-emerald-300"
		>
			Anfragen anzeigen
		</button>
	</div>
	{#if data.locationError}
		<p class="text-sm text-red-400">{data.locationError}</p>
	{:else if data.origin}
		<p class="text-xs text-neutral-400">
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
	<p class="mt-2 text-sm text-neutral-400">
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
	<EmptyState
		icon={MagnifyingGlass}
		title="Keine passenden Anfragen"
		text="Versuch einen größeren Umkreis, eine andere Kategorie oder einen kürzeren Suchbegriff."
		action={{ href: '/anfragen', label: 'Filter zurücksetzen' }}
	/>
{/if}
