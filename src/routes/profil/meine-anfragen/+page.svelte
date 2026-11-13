<script lang="ts">
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Wrench from 'phosphor-svelte/lib/Wrench';
	import { requestDisplayStatus, requestStatusLabels } from '#lib/status.ts';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const now = new Date();
</script>

<svelte:head><title>Meine Anfragen – RepairHub</title></svelte:head>

<div class="mb-6 flex flex-wrap items-center justify-between gap-2">
	<h1 class="text-3xl font-semibold tracking-tight">Meine Anfragen</h1>
	<a href="/anfragen/neu" class="text-sm font-medium text-emerald-400 hover:underline">
		+ Neue Anfrage
	</a>
</div>

{#if data.requests.length}
	<div class="space-y-2">
		{#each data.requests as r (r.id)}
			{@const status = requestDisplayStatus(r, now)}
			<a
				href="/anfragen/{r.id}"
				class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface p-4 hover:bg-raised"
			>
				<div>
					<div class="font-medium">{r.title}</div>
					<div class="text-sm text-neutral-300">
						erstellt am {r.createdAt.toLocaleDateString('de-DE')}
					</div>
				</div>
				<div class="flex items-center gap-3">
					{#if status === 'open'}
						<span
							class="text-sm font-medium {r.pendingQuotes
								? 'text-emerald-400'
								: 'text-neutral-400'}"
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
	<EmptyState
		icon={Wrench}
		title="Du hast noch keine Anfragen erstellt"
		text="Beschreib, was kaputt ist. Reparateure in deiner Nähe melden sich mit einem Angebot."
		action={{ href: '/anfragen/neu', label: 'Anfrage erstellen' }}
	/>
{/if}
