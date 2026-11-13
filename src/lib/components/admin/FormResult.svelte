<script lang="ts">
	// Success or error line for super admin forms (`{ done }` or `{ message }` from superAction).
	let { form }: { form: { done?: string; message?: string } | null | undefined } = $props();
</script>

{#if form?.message}
	<p class="rounded-md bg-red-400/10 p-3 text-sm text-red-400" role="alert">{form.message}</p>
{:else if form?.done}
	<p class="rounded-md bg-emerald-400/10 p-3 text-sm text-emerald-300" role="status">{form.done}</p>
{/if}
