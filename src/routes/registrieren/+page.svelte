<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Registrieren – RepairHub</title></svelte:head>

<div class="mx-auto max-w-sm">
	<h1 class="mb-6 text-3xl font-semibold tracking-tight">Konto erstellen</h1>
	<form method="post" use:enhance class="space-y-4 rounded-xl bg-surface p-6">
		<label class="block">
			<span class="text-sm font-medium">Name</span>
			<input
				name="name"
				required
				autocomplete="name"
				value={form?.name ?? ''}
				class="mt-1 w-full rounded-md border-edge"
			/>
		</label>
		<label class="block">
			<span class="text-sm font-medium">E-Mail</span>
			<input
				type="email"
				name="email"
				required
				autocomplete="email"
				value={form?.email ?? ''}
				class="mt-1 w-full rounded-md border-edge"
			/>
		</label>
		<label class="block">
			<span class="text-sm font-medium">Passwort</span>
			<input
				type="password"
				name="password"
				required
				minlength="8"
				autocomplete="new-password"
				class="mt-1 w-full rounded-md border-edge"
			/>
			<span class="text-xs text-neutral-400">Mindestens 8 Zeichen</span>
		</label>
		{#if form?.message}
			<p class="text-sm text-red-400">{form.message}</p>
		{/if}
		<button
			class="w-full rounded-md bg-emerald-400 py-2 font-semibold text-neutral-950 hover:bg-emerald-300"
		>
			Registrieren
		</button>
	</form>
	<p class="mt-4 text-center text-sm text-neutral-300">
		Schon registriert?
		<a href="/anmelden{page.url.search}" class="text-emerald-400 hover:underline">Anmelden</a>
	</p>
</div>
