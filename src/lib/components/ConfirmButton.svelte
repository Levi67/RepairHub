<script lang="ts">
	// Two-step submit for destructive actions, placed inside a <form>. Built on <details>, so the
	// confirmation also works without JavaScript; with JS, Escape and "Abbrechen" close it.
	let {
		label,
		message,
		confirmLabel = label,
		class: triggerClass = ''
	}: { label: string; message: string; confirmLabel?: string; class?: string } = $props();

	let open = $state(false);
</script>

<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Escape') open = false;
	}}
/>

<details class="relative" bind:open>
	<summary class="cursor-pointer list-none [&::-webkit-details-marker]:hidden {triggerClass}">
		{label}
	</summary>
	<div
		class="absolute top-full right-0 z-20 mt-2 w-72 rounded-xl bg-raised p-4 text-left shadow-xl ring-1 shadow-black/40 ring-edge"
		role="alertdialog"
		aria-label={label}
	>
		<p class="text-sm text-neutral-200">{message}</p>
		<div class="mt-4 flex justify-end gap-2">
			<button
				type="button"
				class="rounded-md px-3 py-2 text-sm font-semibold text-neutral-300 hover:bg-edge"
				onclick={() => (open = false)}
			>
				Abbrechen
			</button>
			<button
				class="rounded-md bg-red-500 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-red-400"
			>
				{confirmLabel}
			</button>
		</div>
	</div>
</details>
