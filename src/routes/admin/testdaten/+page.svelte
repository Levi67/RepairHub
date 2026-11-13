<script lang="ts">
	import { enhance } from '$app/forms';
	import ConfirmButton from '#lib/components/ConfirmButton.svelte';
	import FormResult from '#lib/components/admin/FormResult.svelte';
	import OwnPassword from '#lib/components/admin/OwnPassword.svelte';
	import Flask from 'phosphor-svelte/lib/Flask';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let busy = $state(false);
	let scope = $state<'test' | 'all'>('test');
	const card = 'rounded-xl bg-surface p-6';
	const button = 'rounded-md px-3 py-2 text-sm font-semibold';
	const others = $derived(data.users.filter((u) => u.id !== data.myId));
</script>

<svelte:head><title>Testdaten – Admin – RepairHub</title></svelte:head>

<h1 class="text-3xl font-semibold tracking-tight">Testdaten</h1>
<p class="mt-2 max-w-2xl text-neutral-400">
	Erzeugte Anfragen sehen für alle anderen aus wie echte. Intern sind sie markiert, damit du sie
	gesammelt wieder löschen kannst.
</p>

<div class="mt-6"><FormResult {form} /></div>

<div class="mt-6 grid gap-6 lg:grid-cols-2">
	<section class={card}>
		<h2 class="text-lg font-semibold">Testanfragen erzeugen</h2>
		<p class="mt-1 text-sm text-neutral-400">
			Zufällig aus einem Pool: Titel, Beschreibung, Kategorie, Budget, Übergabe und eine echte PLZ
			(Großstädte, damit sie auf der Karte verteilt sind). Jede bekommt 0 bis 3 Angebote von
			Test-Reparateuren.
		</p>
		<form
			method="post"
			action="?/generate"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update({ reset: false });
					busy = false;
				};
			}}
			class="mt-4 space-y-3"
		>
			<label class="block">
				<span class="text-sm font-medium">Anzahl</span>
				<input
					name="count"
					type="number"
					min="1"
					max="50"
					value="10"
					required
					class="mt-1 w-28 rounded-md border-edge"
				/>
			</label>
			<label class="block">
				<span class="text-sm font-medium">Erstellt von</span>
				<select name="owner" class="mt-1 w-full rounded-md border-edge">
					<option value="pool">Testkunden (zufällig)</option>
					<option value={data.myId}>Mir</option>
					<optgroup label="Anderer Nutzer">
						{#each others as u (u.id)}
							<option value={u.id}>{u.name} ({u.isTest ? 'Testkonto' : u.email})</option>
						{/each}
					</optgroup>
				</select>
			</label>
			<button
				disabled={busy}
				class="{button} inline-flex items-center gap-2 bg-emerald-400 text-neutral-950 hover:bg-emerald-300 disabled:opacity-60"
			>
				<Flask size={16} weight="bold" />
				{busy ? 'Wird erzeugt …' : 'Erzeugen'}
			</button>
		</form>
	</section>

	<section class="rounded-xl bg-surface p-6 ring-1 ring-red-400/30">
		<h2 class="text-lg font-semibold text-red-300">Anfragen löschen</h2>
		<p class="mt-1 text-sm text-neutral-400">
			Löscht die Anfragen mit Fotos, Angeboten, Aufträgen, Chats und Bewertungen. Nutzer bleiben.
		</p>
		<form method="post" action="?/wipe" use:enhance class="mt-4 space-y-3">
			<fieldset class="space-y-2 text-sm">
				<label class="flex items-center gap-2">
					<input
						type="radio"
						name="scope"
						value="test"
						bind:group={scope}
						class="border-edge text-red-400"
					/>
					Nur Testanfragen
				</label>
				<label class="flex items-center gap-2">
					<input
						type="radio"
						name="scope"
						value="all"
						bind:group={scope}
						class="border-edge text-red-400"
					/>
					<span>Alle Anfragen <span class="text-red-300">(auch echte)</span></span>
				</label>
			</fieldset>
			<label class="flex items-start gap-2 text-sm text-neutral-300">
				<input type="checkbox" name="refund" class="mt-0.5 rounded border-edge text-red-400" />
				Bezahlte, noch nicht ausgezahlte Aufträge vorher in Stripe erstatten
			</label>
			<OwnPassword />
			<button class="{button} bg-red-500 text-neutral-950 hover:bg-red-400">
				{scope === 'all' ? 'Alle Anfragen löschen' : 'Testanfragen löschen'}
			</button>
		</form>
	</section>

	<section class={card}>
		<h2 class="text-lg font-semibold">Testkonten</h2>
		<p class="mt-1 text-sm text-neutral-400">
			{data.users.filter((u) => u.isTest).length} Testkonten (6 Kunden, 4 Reparateure). Sie entstehen
			beim ersten Erzeugen und werden wiederverwendet. Über „Nutzer“ kannst du dich als sie anmelden.
		</p>
		<form method="post" action="?/deleteAccounts" use:enhance class="mt-4">
			<ConfirmButton
				label="Testkonten löschen"
				message="Alle Testkonten mit ihren Anfragen, Angeboten und Aufträgen löschen?"
				class="inline-block {button} bg-raised hover:bg-edge"
			/>
		</form>
	</section>
</div>
