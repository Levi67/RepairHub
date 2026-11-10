<script lang="ts">
	import { handoverLabels, handoverModes } from '#lib/handover.ts';
	import { timeframeLabels, timeframes } from '#lib/timeframe.ts';
	import { MAX_PHOTOS, type RequestFormValues } from '#lib/schemas/request.ts';
	import type { CategoryGroup } from '#lib/server/requests.ts';
	import PhotoPicker, { type Photo } from './PhotoPicker.svelte';
	import PlzCityFields from './PlzCityFields.svelte';

	let {
		categories,
		values,
		errors,
		photos = $bindable(),
		busy = $bindable(false)
	}: {
		categories: CategoryGroup[];
		values: RequestFormValues;
		errors: Record<string, string>;
		photos: Photo[];
		busy?: boolean;
	} = $props();
</script>

{#snippet error(field: string)}
	{#if errors[field]}
		<p class="mt-1 text-sm text-red-600">{errors[field]}</p>
	{/if}
{/snippet}

<label class="block">
	<span class="text-sm font-medium">Titel *</span>
	<input
		name="title"
		required
		maxlength="80"
		placeholder="z. B. iPhone 13 – Display gesprungen"
		value={values.title}
		class="mt-1 w-full rounded-md border-stone-300"
	/>
	{@render error('title')}
</label>

<label class="block">
	<span class="text-sm font-medium">Kategorie *</span>
	<select
		name="categoryId"
		required
		value={values.categoryId}
		class="mt-1 w-full rounded-md border-stone-300"
	>
		<option value="" disabled>Bitte wählen …</option>
		{#each categories as cat (cat.id)}
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
		class="mt-1 w-full rounded-md border-stone-300">{values.description}</textarea
	>
	{@render error('description')}
</label>

<div>
	<span class="text-sm font-medium">Fotos * (1–{MAX_PHOTOS})</span>
	<p class="mb-2 text-xs text-stone-500">
		Zeig den Defekt und, wenn möglich, das Typenschild. Fotos werden vor dem Hochladen verkleinert.
	</p>
	<PhotoPicker bind:photos bind:busy max={MAX_PHOTOS} />
	{@render error('photos')}
</div>

<div class="grid gap-4 sm:grid-cols-2">
	<label class="block">
		<span class="text-sm font-medium">Marke</span>
		<input name="brand" value={values.brand} class="mt-1 w-full rounded-md border-stone-300" />
	</label>
	<label class="block">
		<span class="text-sm font-medium">Modell</span>
		<input name="model" value={values.model} class="mt-1 w-full rounded-md border-stone-300" />
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
					checked={values.handoverModes.includes(mode)}
					class="rounded border-stone-300 text-emerald-600"
				/>
				{handoverLabels[mode]}
			</label>
		{/each}
	</div>
	{@render error('handoverModes')}
</fieldset>

<div class="grid gap-4 sm:grid-cols-3">
	<PlzCityFields
		plz={values.plz}
		city={values.city}
		required
		plzError={errors.plz}
		cityError={errors.city}
		cityClass="sm:col-span-2"
	/>
</div>

<div class="grid gap-4 sm:grid-cols-2">
	<label class="block">
		<span class="text-sm font-medium">Budget (optional)</span>
		<div class="mt-1 flex items-center gap-2">
			<span class="text-stone-600">bis ca.</span>
			<input
				name="budget"
				inputmode="decimal"
				placeholder="50"
				value={values.budget}
				class="w-32 rounded-md border-stone-300"
			/>
			<span class="text-stone-600">€</span>
		</div>
		{@render error('budget')}
	</label>
	<label class="block">
		<span class="text-sm font-medium">Zeitrahmen (optional)</span>
		<select
			name="timeframe"
			value={values.timeframe}
			class="mt-1 w-full rounded-md border-stone-300"
		>
			<option value="">keine Angabe</option>
			{#each timeframes as t (t)}
				<option value={t}>{timeframeLabels[t]}</option>
			{/each}
		</select>
		{@render error('timeframe')}
	</label>
</div>
