<script lang="ts">
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ClockCounterClockwise from 'phosphor-svelte/lib/ClockCounterClockwise';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const detailText = (details: unknown) =>
		details && typeof details === 'object'
			? Object.entries(details as Record<string, unknown>)
					.map(([k, v]) => `${k}: ${v}`)
					.join(' · ')
			: '';
</script>

<svelte:head><title>Protokoll – Admin – RepairHub</title></svelte:head>

<h1 class="text-3xl font-semibold tracking-tight">Protokoll</h1>
<p class="mt-2 text-neutral-400">Die letzten 300 Super-Admin-Aktionen.</p>

{#if data.entries.length}
	<ol class="mt-6 divide-y divide-edge rounded-xl bg-surface">
		{#each data.entries as e (e.id)}
			<li class="grid gap-1 p-4 text-sm sm:grid-cols-[10rem_1fr]">
				<time class="text-neutral-400 tabular-nums">
					{e.createdAt.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
				</time>
				<div>
					<span class="font-semibold">{e.action}</span>
					{#if e.target}<span class="text-neutral-300"> · {e.target}</span>{/if}
					{#if detailText(e.details)}
						<div class="text-xs text-neutral-400">{detailText(e.details)}</div>
					{/if}
					<div class="text-xs text-neutral-500">von {e.actorName ?? 'gelöschtem Konto'}</div>
				</div>
			</li>
		{/each}
	</ol>
{:else}
	<div class="mt-6">
		<EmptyState
			icon={ClockCounterClockwise}
			title="Noch nichts passiert"
			text="Hier erscheinen Löschungen, temporäre Passwörter, erzwungene Status und Anmeldungen als andere Nutzer."
		/>
	</div>
{/if}
