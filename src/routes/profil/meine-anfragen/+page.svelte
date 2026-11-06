<script lang="ts">
	import { requestStatusLabels } from '#lib/status.ts';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const now = new Date();
</script>

<svelte:head><title>Meine Anfragen – RepairHub</title></svelte:head>

<div class="mb-6 flex flex-wrap items-center justify-between gap-2">
	<h1 class="text-2xl font-bold">Meine Anfragen</h1>
	<a href="/anfragen/neu" class="text-sm font-medium text-emerald-700 hover:underline">
		+ Neue Anfrage
	</a>
</div>

{#if data.requests.length}
	<div class="space-y-2">
		{#each data.requests as r (r.id)}
			{@const status = r.status === 'open' && r.expiresAt <= now ? 'expired' : r.status}
			<a
				href="/anfragen/{r.id}"
				class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white p-4 hover:border-emerald-400"
			>
				<div>
					<div class="font-medium">{r.title}</div>
					<div class="text-sm text-stone-600">
						erstellt am {r.createdAt.toLocaleDateString('de-DE')}
					</div>
				</div>
				<div class="flex items-center gap-3">
					{#if status === 'open'}
						<span
							class="text-sm font-medium {r.pendingQuotes ? 'text-emerald-700' : 'text-stone-500'}"
						>
							{r.pendingQuotes}
							{r.pendingQuotes === 1 ? 'Angebot' : 'Angebote'}
						</span>
					{/if}
					<StatusBadge {status} label={requestStatusLabels[status]} />
				</div>
			</a>
		{/each}
	</div>
{:else}
	<p class="text-stone-500">
		Du hast noch keine Anfragen erstellt.
		<a href="/anfragen/neu" class="text-emerald-700 hover:underline">Jetzt eine erstellen</a>
	</p>
{/if}
