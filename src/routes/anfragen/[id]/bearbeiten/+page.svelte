<script lang="ts">
	import { enhance } from '$app/forms';
	import RequestFormFields from '#lib/components/RequestFormFields.svelte';
	import PhotoPicker, { type Photo } from '#lib/components/PhotoPicker.svelte';
	import { MAX_PHOTOS } from '#lib/schemas/request.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(form?.values ?? data.values);
	const errors = $derived<Record<string, string>>(form?.errors ?? {});

	// Initial value only: edits stay in the picker across failed submits.
	// svelte-ignore state_referenced_locally
	let photos = $state<Photo[]>(data.photos);
	let busy = $state(false);

	const keepValues =
		() =>
		({ update }: { update: (opts?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
</script>

<svelte:head><title>Anfrage bearbeiten – RepairHub</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<a href="/anfragen/{data.requestId}" class="text-sm text-emerald-700 hover:underline">
		← Zurück zur Anfrage
	</a>
	<h1 class="mt-4 mb-2 text-2xl font-bold">Anfrage bearbeiten</h1>

	{#if data.mode === 'full'}
		<p class="mb-6 text-stone-600">Solange noch kein Angebot da ist, kannst du alles ändern.</p>
		<form
			method="post"
			action="?/update"
			use:enhance={keepValues}
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
				{busy ? 'Fotos werden hochgeladen …' : 'Änderungen speichern'}
			</button>
		</form>
	{:else}
		<p class="mb-6 text-stone-600">
			Es gibt schon Angebote zu „{data.title}“. Damit Reparateure wissen, worauf sie geboten haben,
			kannst du nichts mehr ändern, aber einen Nachtrag schreiben und Fotos ergänzen.
		</p>
		<form
			method="post"
			action="?/add"
			use:enhance={keepValues}
			class="space-y-5 rounded-lg border border-stone-200 bg-white p-6"
		>
			<label class="block">
				<span class="text-sm font-medium">Nachtrag</span>
				<textarea
					name="addendum"
					rows="4"
					maxlength="1000"
					placeholder="z. B. Das Gerät geht inzwischen gar nicht mehr an."
					class="mt-1 w-full rounded-md border-stone-300">{form?.addendum ?? ''}</textarea
				>
				<span class="text-xs text-stone-500"> Erscheint mit Datum unter deiner Beschreibung. </span>
				{#if errors.addendum}
					<p class="mt-1 text-sm text-red-600">{errors.addendum}</p>
				{/if}
			</label>

			<div>
				<span class="text-sm font-medium">Fotos ergänzen</span>
				<div class="mt-2">
					<PhotoPicker bind:photos bind:busy max={MAX_PHOTOS} />
				</div>
				{#if errors.photos}
					<p class="mt-1 text-sm text-red-600">{errors.photos}</p>
				{/if}
			</div>

			{#if form?.message}
				<p class="rounded-md bg-red-50 p-3 text-sm text-red-700">{form.message}</p>
			{/if}

			<button
				disabled={busy}
				class="w-full rounded-md bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
			>
				{busy ? 'Fotos werden hochgeladen …' : 'Hinzufügen'}
			</button>
		</form>
	{/if}
</div>
