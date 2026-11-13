<script lang="ts">
	// PLZ + Ort. Typing a known PLZ fills in the Ort and suggests the places in that area.
	let {
		plz,
		city,
		required = false,
		plzError,
		cityError,
		cityClass = ''
	}: {
		plz: string;
		city: string;
		required?: boolean;
		plzError?: string;
		cityError?: string;
		/** Extra classes for the Ort label, e.g. a grid span. */
		cityClass?: string;
	} = $props();

	const listId = $props.id();
	let cityInput = $state<HTMLInputElement>();
	let places = $state<string[]>([]);
	let unknown = $state(false);
	// The last Ort we filled in, so a name the user typed themselves is never overwritten.
	let autofilled = '';

	async function lookup(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value.trim();
		unknown = false;
		if (!/^\d{5}$/.test(value)) {
			places = [];
			return;
		}
		const res = await fetch(`/api/geo/plz/${value}`).catch(() => null);
		if (!res?.ok) {
			places = [];
			unknown = res?.status === 404;
			return;
		}
		const info: { city: string; places: string[] } = await res.json();
		places = info.places;
		if (cityInput && (!cityInput.value.trim() || cityInput.value === autofilled)) {
			cityInput.value = info.city;
			autofilled = info.city;
		}
	}
</script>

<label class="block">
	<span class="text-sm font-medium">PLZ{required ? ' *' : ''}</span>
	<input
		name="plz"
		{required}
		inputmode="numeric"
		pattern={'[0-9]{5}'}
		maxlength="5"
		autocomplete="postal-code"
		value={plz}
		oninput={lookup}
		class="mt-1 w-full rounded-md border-edge"
	/>
	{#if plzError}
		<p class="mt-1 text-sm text-red-400">{plzError}</p>
	{:else if unknown}
		<p class="mt-1 text-sm text-amber-300">Diese PLZ kennen wir nicht.</p>
	{/if}
</label>
<label class="block {cityClass}">
	<span class="text-sm font-medium">Ort{required ? ' *' : ''}</span>
	<input
		bind:this={cityInput}
		name="city"
		{required}
		maxlength="80"
		autocomplete="address-level2"
		list={listId}
		value={city}
		class="mt-1 w-full rounded-md border-edge"
	/>
	<datalist id={listId}>
		{#each places as place (place)}
			<option value={place}></option>
		{/each}
	</datalist>
	{#if cityError}
		<p class="mt-1 text-sm text-red-400">{cityError}</p>
	{/if}
</label>
