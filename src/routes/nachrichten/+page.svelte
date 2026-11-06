<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Nachrichten – RepairHub</title></svelte:head>

<h1 class="mb-6 text-2xl font-bold">Nachrichten</h1>

{#if data.conversations.length}
	<div class="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
		{#each data.conversations as c (c.id)}
			<a href="/nachrichten/{c.id}" class="flex items-center gap-3 p-4 hover:bg-stone-50">
				<div class="min-w-0 flex-1">
					<div class="flex items-baseline justify-between gap-2">
						<span class="truncate {c.unread ? 'font-bold' : 'font-medium'}">{c.otherPartyName}</span
						>
						<span class="shrink-0 text-xs text-stone-400">
							{(c.lastMessageAt ?? c.createdAt).toLocaleDateString('de-DE')}
						</span>
					</div>
					<div class="truncate text-sm text-stone-500">{c.requestTitle}</div>
					<div class="truncate text-sm {c.unread ? 'text-stone-900' : 'text-stone-500'}">
						{c.lastBody ?? 'Noch keine Nachrichten'}
					</div>
				</div>
				{#if c.unread}
					<span
						class="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white"
					>
						{c.unread}
					</span>
				{/if}
			</a>
		{/each}
	</div>
{:else}
	<p class="text-stone-500">
		Noch keine Unterhaltungen. Ein Chat beginnt, sobald ein Reparateur ein Angebot abgibt oder eine
		Frage zu einer Anfrage stellt.
	</p>
{/if}
