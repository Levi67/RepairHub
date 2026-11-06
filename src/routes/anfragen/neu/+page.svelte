<script lang="ts">
	import { enhance } from '$app/forms';
	import { handoverLabels, handoverModes } from '#lib/handover.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(form?.values);
	const errors = $derived<Record<string, string>>(form?.errors ?? {});
</script>

<svelte:head><title>Anfrage erstellen – RepairHub</title></svelte:head>

{#snippet error(field: string)}
	{#if errors[field]}
		<p class="mt-1 text-sm text-red-600">{errors[field]}</p>
	{/if}
{/snippet}

<div class="mx-auto max-w-2xl">
	<h1 class="mb-2 text-2xl font-bold">Reparaturanfrage erstellen</h1>
	<p class="mb-6 text-stone-600">
		Beschreibe, was kaputt ist. Reparateure schicken dir daraufhin Angebote.
	</p>

	<form method="post" use:enhance class="space-y-5 rounded-lg border border-stone-200 bg-white p-6">
		<label class="block">
			<span class="text-sm font-medium">Titel *</span>
			<input
				name="title"
				required
				maxlength="80"
				placeholder="z. B. iPhone 13 – Display gesprungen"
				value={values?.title ?? ''}
				class="mt-1 w-full rounded-md border-stone-300"
			/>
			{@render error('title')}
		</label>

		<label class="block">
			<span class="text-sm font-medium">Kategorie *</span>
			<select
				name="categoryId"
				required
				value={values?.categoryId ?? ''}
				class="mt-1 w-full rounded-md border-stone-300"
			>
				<option value="" disabled>Bitte wählen …</option>
				{#each data.categories as cat (cat.id)}
					{#if cat.children.length}
						<optgroup label={cat.name}>
							{#each cat.children as child (child.id)}
								<option value={child.id}>{child.name}</option>
							{/each}
						</optgroup>
					{:else}
						<option value={cat.id}>{cat.name}</option>
					{/if}
				{/each}
			</select>
			{@render error('categoryId')}
		</label>

		<label class="block">
			<span class="text-sm font-medium">Beschreibung des Defekts *</span>
			<textarea
				name="description"
				required
				rows="5"
				maxlength="2000"
				placeholder="Was ist kaputt? Seit wann? Was hast du schon versucht?"
				class="mt-1 w-full rounded-md border-stone-300">{values?.description ?? ''}</textarea
			>
			{@render error('description')}
		</label>

		<div class="grid gap-4 sm:grid-cols-2">
			<label class="block">
				<span class="text-sm font-medium">Marke</span>
				<input
					name="brand"
					value={values?.brand ?? ''}
					class="mt-1 w-full rounded-md border-stone-300"
				/>
			</label>
			<label class="block">
				<span class="text-sm font-medium">Modell</span>
				<input
					name="model"
					value={values?.model ?? ''}
					class="mt-1 w-full rounded-md border-stone-300"
				/>
			</label>
		</div>

		<fieldset>
			<legend class="text-sm font-medium">Übergabe *</legend>
			<div class="mt-2 flex flex-wrap gap-4">
				{#each handoverModes as mode (mode)}
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							name="handoverModes"
							value={mode}
							checked={values?.handoverModes.includes(mode) ?? false}
							class="rounded border-stone-300 text-emerald-600"
						/>
						{handoverLabels[mode]}
					</label>
				{/each}
			</div>
			{@render error('handoverModes')}
		</fieldset>

		<div class="grid gap-4 sm:grid-cols-3">
			<label class="block">
				<span class="text-sm font-medium">PLZ *</span>
				<input
					name="plz"
					required
					inputmode="numeric"
					pattern="\d{5}"
					maxlength="5"
					value={values?.plz ?? ''}
					class="mt-1 w-full rounded-md border-stone-300"
				/>
				{@render error('plz')}
			</label>
			<label class="block sm:col-span-2">
				<span class="text-sm font-medium">Ort *</span>
				<input
					name="city"
					required
					value={values?.city ?? ''}
					class="mt-1 w-full rounded-md border-stone-300"
				/>
				{@render error('city')}
			</label>
		</div>

		<label class="block">
			<span class="text-sm font-medium">Budget (optional)</span>
			<div class="mt-1 flex items-center gap-2">
				<span class="text-stone-600">bis ca.</span>
				<input
					name="budget"
					inputmode="decimal"
					placeholder="50"
					value={values?.budget ?? ''}
					class="w-32 rounded-md border-stone-300"
				/>
				<span class="text-stone-600">€</span>
			</div>
			{@render error('budget')}
		</label>

		<p class="text-xs text-stone-500">Fotos hochladen kommt in einer späteren Version.</p>

		<button
			class="w-full rounded-md bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700"
		>
			Anfrage veröffentlichen
		</button>
	</form>
</div>
