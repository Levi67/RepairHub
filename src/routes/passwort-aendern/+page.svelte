<script lang="ts">
	import { enhance } from '$app/forms';
	import Key from 'phosphor-svelte/lib/Key';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Neues Passwort festlegen – RepairHub</title></svelte:head>

<section class="mx-auto max-w-md pt-8">
	<div class="flex items-center gap-3 text-emerald-400">
		<Key size={24} weight="duotone" />
		<span class="text-sm font-semibold">Temporäres Passwort</span>
	</div>
	<h1 class="mt-4 text-3xl font-semibold tracking-tight">Neues Passwort festlegen</h1>
	<p class="mt-3 text-neutral-400">
		Du hast dich mit einem Passwort angemeldet, das die Verwaltung für dich gesetzt hat. Wähle jetzt
		ein eigenes, danach geht es normal weiter.
	</p>

	<form method="post" use:enhance class="mt-8 space-y-4 rounded-xl bg-surface p-6">
		<label class="block">
			<span class="text-sm font-medium">Neues Passwort</span>
			<input
				type="password"
				name="newPassword"
				autocomplete="new-password"
				required
				minlength="8"
				maxlength="128"
				class="mt-1 w-full rounded-md border-edge"
			/>
			{#if form?.errors?.newPassword}
				<span class="mt-1 block text-sm text-red-400">{form.errors.newPassword}</span>
			{/if}
		</label>
		<label class="block">
			<span class="text-sm font-medium">Passwort wiederholen</span>
			<input
				type="password"
				name="confirmPassword"
				autocomplete="new-password"
				required
				class="mt-1 w-full rounded-md border-edge"
			/>
			{#if form?.errors?.confirmPassword}
				<span class="mt-1 block text-sm text-red-400">{form.errors.confirmPassword}</span>
			{/if}
		</label>
		<button
			class="w-full rounded-md bg-emerald-400 px-3 py-2 font-semibold text-neutral-950 hover:bg-emerald-300"
		>
			Passwort speichern
		</button>
	</form>
	<form method="post" action="/abmelden" class="mt-4 text-center">
		<button class="text-sm text-neutral-400 hover:text-neutral-100">Abmelden</button>
	</form>
</section>
