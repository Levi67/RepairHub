<script lang="ts">
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ChatCircle from 'phosphor-svelte/lib/ChatCircle';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Nachrichten – RepairHub</title></svelte:head>

<h1 class="mb-6 text-3xl font-semibold tracking-tight">Nachrichten</h1>

{#if data.conversations.length}
	<div class="divide-y divide-edge rounded-xl bg-surface">
		{#each data.conversations as c (c.id)}
			<a href="/nachrichten/{c.id}" class="flex items-center gap-3 p-4 hover:bg-raised">
				<div class="min-w-0 flex-1">
					<div class="flex items-baseline justify-between gap-2">
						<span class="truncate {c.unread ? 'font-semibold' : 'font-medium'}"
							>{c.otherPartyName}</span
						>
						<span class="shrink-0 text-xs text-neutral-500">
							{(c.lastMessageAt ?? c.createdAt).toLocaleDateString('de-DE')}
						</span>
					</div>
					<div class="truncate text-sm text-neutral-400">{c.requestTitle}</div>
					<div class="truncate text-sm {c.unread ? 'text-neutral-100' : 'text-neutral-400'}">
						{c.lastBody ?? 'Noch keine Nachrichten'}
					</div>
				</div>
				{#if c.unread}
					<span
						class="shrink-0 rounded-sm bg-emerald-400 px-2 py-0.5 text-xs font-semibold text-neutral-950"
					>
						{c.unread}
					</span>
				{/if}
			</a>
		{/each}
	</div>
{:else}
	<EmptyState
		icon={ChatCircle}
		title="Noch keine Unterhaltungen"
		text="Ein Chat beginnt, sobald ein Reparateur ein Angebot abgibt oder eine Frage zu einer Anfrage stellt."
	/>
{/if}
