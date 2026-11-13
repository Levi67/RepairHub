<script lang="ts">
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { requestStatusLabels } from '#lib/status.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Anfragen – Admin – RepairHub</title></svelte:head>

<h1 class="text-3xl font-semibold tracking-tight">Anfragen</h1>

<form method="get" class="mt-4 flex flex-wrap items-center gap-2" data-sveltekit-keepfocus>
	<input
		type="search"
		name="q"
		value={data.q}
		placeholder="Titel oder Name"
		class="w-full max-w-sm rounded-md border-edge text-sm"
	/>
	<label class="flex items-center gap-2 text-sm text-neutral-300">
		<input
			type="checkbox"
			name="test"
			value="1"
			checked={data.onlyTest}
			class="rounded border-edge text-emerald-400"
		/>
		Nur Testanfragen
	</label>
	<button
		class="rounded-md bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-300"
	>
		Suchen
	</button>
</form>

<p class="mt-4 text-sm text-neutral-400">
	{data.requests.length === 100 ? 'Die neuesten 100 Treffer' : `${data.requests.length} Anfragen`}
</p>

<ul class="mt-2 divide-y divide-edge rounded-xl bg-surface">
	{#each data.requests as r (r.id)}
		<li>
			<a
				href="/admin/anfragen/{r.id}"
				class="flex flex-wrap items-center gap-4 p-4 hover:bg-raised"
			>
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<span class="font-medium">{r.title}</span>
						{#if r.isTest}
							<span class="rounded-sm bg-raised px-2 py-0.5 text-xs text-neutral-300">Test</span>
						{/if}
					</div>
					<div class="text-sm text-neutral-400">
						{r.customerName} · {r.plz}
						{r.city} · {r.quotes}
						{r.quotes === 1 ? 'Angebot' : 'Angebote'} · {r.createdAt.toLocaleDateString('de-DE')}
					</div>
				</div>
				<StatusBadge status={r.status} label={requestStatusLabels[r.status]} />
			</a>
		</li>
	{:else}
		<li class="p-4 text-sm text-neutral-400">Keine Anfragen gefunden.</li>
	{/each}
</ul>
