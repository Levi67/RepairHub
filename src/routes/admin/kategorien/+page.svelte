<script lang="ts">
	import ConfirmButton from '#lib/components/ConfirmButton.svelte';
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type Row =
		(typeof data.categories)[number] | (typeof data.categories)[number]['children'][number];
	// Which inline form a failure belongs to, so its message shows next to it.
	const failedId = $derived(form && 'id' in form ? form.id : null);
	const failedCreateIn = $derived(form && 'createIn' in form ? form.createIn : null);

	const keepInput =
		() =>
		async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
</script>

<svelte:head><title>Kategorien – Admin – RepairHub</title></svelte:head>

<h1 class="text-3xl font-semibold tracking-tight">Kategorien</h1>
<p class="mt-1 text-sm text-neutral-400">
	Namen und Reihenfolge erscheinen sofort in Formularen und Filtern. Kategorien, die von Anfragen
	verwendet werden, lassen sich nur umbenennen. Anfragen können nur Unterkategorien wählen, also
	braucht jede Oberkategorie mindestens eine Unterkategorie.
</p>

{#if form?.message && !failedId && !failedCreateIn}
	<p class="mt-4 rounded-md bg-red-400/10 p-3 text-sm text-red-400">{form.message}</p>
{/if}

{#snippet row(c: Row, index: number, count: number, isTop: boolean)}
	<div class="flex flex-wrap items-center gap-2 {isTop ? '' : 'pl-6'}">
		<form method="post" action="?/rename" use:enhance={keepInput} class="flex min-w-0 flex-1 gap-2">
			<input type="hidden" name="id" value={c.id} />
			<input
				name="name"
				value={c.name}
				required
				maxlength="60"
				aria-label="Name"
				class="w-full max-w-xs rounded-md border-edge py-1 text-sm {isTop ? 'font-semibold' : ''}"
			/>
			<button class="rounded-md border border-edge px-2 py-1 text-xs hover:bg-raised">
				Umbenennen
			</button>
		</form>
		<span class="w-24 text-xs text-neutral-400 tabular-nums">
			{c.requests}
			{c.requests === 1 ? 'Anfrage' : 'Anfragen'}
		</span>
		<form method="post" action="?/move" use:enhance class="flex gap-1">
			<input type="hidden" name="id" value={c.id} />
			<button
				name="direction"
				value="up"
				disabled={index === 0}
				aria-label="Nach oben"
				class="rounded-md border border-edge px-2 py-1 text-xs hover:bg-raised disabled:opacity-30"
			>
				↑
			</button>
			<button
				name="direction"
				value="down"
				disabled={index === count - 1}
				aria-label="Nach unten"
				class="rounded-md border border-edge px-2 py-1 text-xs hover:bg-raised disabled:opacity-30"
			>
				↓
			</button>
		</form>
		<form method="post" action="?/delete" use:enhance>
			<input type="hidden" name="id" value={c.id} />
			{#if (c.requests > 0 || ('children' in c && c.children.length > 0)) && data.isSuperAdmin}
				{@render deleteWithContent(c)}
			{:else if c.requests > 0 || ('children' in c && c.children.length > 0)}
				<button
					disabled
					title={c.requests > 0 ? 'Wird von Anfragen verwendet' : 'Hat Unterkategorien'}
					class="rounded-md px-2 py-1 text-xs text-neutral-600"
				>
					Löschen
				</button>
			{:else}
				<ConfirmButton
					label="Löschen"
					message="Kategorie „{c.name}“ löschen?"
					class="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-400/10"
				/>
			{/if}
		</form>
	</div>
	{#if failedId === c.id}
		<p class="mt-1 text-sm text-red-400 {isTop ? '' : 'pl-6'}">{form?.message}</p>
	{/if}
{/snippet}

{#snippet deleteWithContent(c: Row)}
	{@const childIds = 'children' in c ? c.children.map((x) => x.id) : []}
	<details class="relative">
		<summary
			class="cursor-pointer list-none rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-400/10 [&::-webkit-details-marker]:hidden"
		>
			Mit Inhalt löschen …
		</summary>
		<div
			class="absolute top-full right-0 z-20 mt-2 w-80 space-y-3 rounded-xl bg-raised p-4 text-sm shadow-xl ring-1 shadow-black/40 ring-edge"
		>
			<p>
				„{c.name}“ hat {c.requests}
				{c.requests === 1 ? 'Anfrage' : 'Anfragen'}{childIds.length
					? ` und ${childIds.length} Unterkategorien`
					: ''}. Was passiert damit?
			</p>
			<input type="hidden" name="id" value={c.id} />
			<label class="flex items-start gap-2">
				<input
					type="radio"
					name="mode"
					value="move"
					checked
					class="mt-1 border-edge text-red-400"
				/>
				<span>
					Verschieben nach
					<select name="targetId" class="mt-1 w-full rounded-md border-edge text-sm">
						{#each data.categories as top (top.id)}
							{#if top.id !== c.id && !childIds.includes(top.id)}
								<option value={top.id}>{top.name}</option>
							{/if}
							{#each top.children as child (child.id)}
								{#if child.id !== c.id && !childIds.includes(child.id) && top.id !== c.id}
									<option value={child.id}>&nbsp;&nbsp;{child.name}</option>
								{/if}
							{/each}
						{/each}
					</select>
				</span>
			</label>
			<label class="flex items-start gap-2">
				<input type="radio" name="mode" value="delete" class="mt-1 border-edge text-red-400" />
				<span>Mit allen Anfragen löschen (inkl. Angebote, Aufträge, Chats)</span>
			</label>
			<button
				formaction="?/deleteWithContent"
				class="w-full rounded-md bg-red-500 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-red-400"
			>
				Kategorie löschen
			</button>
		</div>
	</details>
{/snippet}

{#snippet createForm(parentId: string | null, placeholder: string)}
	<form method="post" action="?/create" use:enhance class="flex gap-2 {parentId ? 'pl-6' : ''}">
		<input type="hidden" name="parentId" value={parentId ?? ''} />
		<input
			name="name"
			required
			maxlength="60"
			{placeholder}
			class="w-full max-w-xs rounded-md border-dashed border-edge py-1 text-sm"
		/>
		<button
			class="rounded-md bg-emerald-400 px-2 py-1 text-xs font-semibold text-neutral-950 hover:bg-emerald-300"
		>
			Hinzufügen
		</button>
	</form>
	{#if failedCreateIn === (parentId ?? 'top')}
		<p class="mt-1 text-sm text-red-400 {parentId ? 'pl-6' : ''}">{form?.message}</p>
	{/if}
{/snippet}

<div class="mt-6 space-y-4">
	{#each data.categories as top, i (top.id)}
		<section class="space-y-2 rounded-xl bg-surface p-4">
			{@render row(top, i, data.categories.length, true)}
			{#each top.children as child, j (child.id)}
				{@render row(child, j, top.children.length, false)}
			{/each}
			{@render createForm(top.id, 'Neue Unterkategorie')}
		</section>
	{/each}
	<section class="rounded-lg border border-dashed border-edge p-4">
		{@render createForm(null, 'Neue Oberkategorie')}
	</section>
</div>
