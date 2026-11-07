<script lang="ts">
	import { enhance } from '$app/forms';
	import RequestFormFields from '#lib/components/RequestFormFields.svelte';
	import type { Photo } from '#lib/components/PhotoPicker.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(
		form?.values ?? {
			title: '',
			categoryId: '',
			description: '',
			brand: '',
			model: '',
			budget: '',
			handoverModes: [],
			plz: data.defaultPlz,
			city: data.defaultCity,
			timeframe: ''
		}
	);
	const errors = $derived<Record<string, string>>(form?.errors ?? {});

	// Kept across failed submits: the form isn't reset, and the uploads stay valid.
	let photos = $state<Photo[]>([]);
	let busy = $state(false);
</script>

<svelte:head><title>Anfrage erstellen – RepairHub</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<h1 class="mb-2 text-2xl font-bold">Reparaturanfrage erstellen</h1>
	<p class="mb-6 text-stone-600">
		Beschreibe, was kaputt ist. Reparateure schicken dir daraufhin Angebote.
	</p>

	{#if !data.storageEnabled}
		<p class="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
			Foto-Upload ist auf diesem Server noch nicht eingerichtet (SUPABASE_URL und
			SUPABASE_SECRET_KEY fehlen). Ohne Fotos kann keine Anfrage erstellt werden.
		</p>
	{/if}

	<form
		method="post"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false })}
		class="space-y-5 rounded-lg border border-stone-200 bg-white p-6"
	>
		<RequestFormFields categories={data.categories} {values} {errors} bind:photos bind:busy />

		{#if form?.message}
			<p class="rounded-md bg-red-50 p-3 text-sm text-red-700">{form.message}</p>
		{/if}

		<button
			disabled={busy}
			class="w-full rounded-md bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
		>
			{busy ? 'Fotos werden hochgeladen …' : 'Anfrage veröffentlichen'}
		</button>
	</form>
</div>
