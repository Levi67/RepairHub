<script lang="ts">
	import RequestCard from '#lib/components/RequestCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Reparaturanfragen – RepairHub</title></svelte:head>

<h1 class="mb-6 text-2xl font-bold">Reparaturanfragen</h1>

<form method="get" class="mb-6 flex flex-wrap gap-2" data-sveltekit-keepfocus>
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
	<button class="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
		Filtern
	</button>
</form>

{#if data.requests.length}
	<div class="grid gap-3 sm:grid-cols-2">
		{#each data.requests as request (request.id)}
			<RequestCard {request} />
		{/each}
	</div>
{:else}
	<p class="text-stone-500">Keine passenden Anfragen gefunden.</p>
{/if}
