<script lang="ts">
	import { enhance } from '$app/forms';
	import FormResult from '#lib/components/admin/FormResult.svelte';
	import ArrowsClockwise from 'phosphor-svelte/lib/ArrowsClockwise';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ClockCounterClockwise from 'phosphor-svelte/lib/ClockCounterClockwise';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let busy = $state(false);

	const detailText = (details: unknown) =>
		details && typeof details === 'object'
			? Object.entries(details as Record<string, unknown>)
					.map(([k, v]) => `${k}: ${v}`)
					.join(' · ')
			: '';
</script>

<svelte:head><title>Protokoll – Admin – RepairHub</title></svelte:head>

<h1 class="text-3xl font-semibold tracking-tight">Protokoll</h1>
<p class="mt-2 text-neutral-400">Die letzten 300 Super-Admin-Aktionen und automatischen Jobs.</p>

<section class="mt-6 rounded-xl bg-surface p-6">
	<h2 class="text-lg font-semibold">Automatische Wartung</h2>
	<p class="mt-1 max-w-2xl text-sm text-neutral-400">
		Läuft jeden Tag um 4 Uhr (UTC): Anfragen nach 30 Tagen und Angebote nach 7 Tagen laufen ab,
		unbezahlte Aufträge werden nach 24 Stunden storniert, reparierte Aufträge nach 7 Tagen ohne
		Rückmeldung bestätigt und ausgezahlt. Hier kannst du sie sofort ausführen.
	</p>
	<form
		method="post"
		action="?/maintenance"
		class="mt-4 flex flex-wrap items-center gap-3"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update();
				busy = false;
			};
		}}
	>
		<button
			disabled={busy}
			class="inline-flex items-center gap-2 rounded-md bg-raised px-3 py-2 text-sm font-semibold transition-colors duration-300 hover:bg-edge active:scale-[0.98] disabled:opacity-60"
		>
			<ArrowsClockwise class="size-4" />
			{busy ? 'Läuft …' : 'Jetzt ausführen'}
		</button>
	</form>
	<div class="mt-4"><FormResult {form} /></div>
</section>

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
					<div class="text-xs text-neutral-500">
						von {e.actorName ??
							(e.action === data.maintenanceAction ? 'System' : 'gelöschtem Konto')}
					</div>
				</div>
			</li>
		{/each}
	</ol>
{:else}
	<div class="mt-6">
		<EmptyState
			icon={ClockCounterClockwise}
			title="Noch nichts passiert"
			text="Hier erscheinen automatische Wartungsläufe, Löschungen, temporäre Passwörter, erzwungene Status und Anmeldungen als andere Nutzer."
		/>
	</div>
{/if}
