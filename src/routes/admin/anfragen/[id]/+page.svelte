<script lang="ts">
	import { enhance } from '$app/forms';
	import ConfirmButton from '#lib/components/ConfirmButton.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import FormResult from '#lib/components/admin/FormResult.svelte';
	import { orderStatusLabels, quoteStatusLabels, requestStatusLabels } from '#lib/status.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const r = $derived(data.request);

	const card = 'rounded-xl bg-surface p-6';
	const input = 'mt-1 w-full rounded-md border-edge';
	const label = 'text-sm font-medium';
	const button = 'rounded-md px-3 py-2 text-sm font-semibold';
	const isoDate = (d: Date) => d.toISOString().slice(0, 10);
</script>

<svelte:head><title>{r.title} – Admin – RepairHub</title></svelte:head>

<a href="/admin/anfragen" class="text-sm text-emerald-400 hover:underline">← Alle Anfragen</a>

<div class="mt-4 flex flex-wrap items-center gap-3">
	<h1 class="text-3xl font-semibold tracking-tight">{r.title}</h1>
	{#if r.isTest}<span class="rounded-sm bg-raised px-2 py-0.5 text-xs text-neutral-300">Test</span
		>{/if}
	<a href="/anfragen/{r.id}" class="ml-auto {button} bg-raised hover:bg-edge">Öffentlich ansehen</a>
</div>
<p class="mt-1 text-sm text-neutral-400">
	von <a href="/admin/nutzer/{r.customerId}" class="hover:underline">{data.customerName}</a> ·
	erstellt am {r.createdAt.toLocaleDateString('de-DE')}
</p>

<div class="mt-6"><FormResult {form} /></div>

<section class="mt-6 {card}">
	<h2 class="text-lg font-semibold">Anfrage</h2>
	<form method="post" action="?/save" use:enhance class="mt-4 grid gap-3 sm:grid-cols-2">
		<label class="block sm:col-span-2">
			<span class={label}>Titel</span>
			<input name="title" value={r.title} required maxlength="120" class={input} />
		</label>
		<label class="block sm:col-span-2">
			<span class={label}>Beschreibung</span>
			<textarea name="description" rows="5" required maxlength="5000" class={input}
				>{r.description}</textarea
			>
		</label>
		<label class="block">
			<span class={label}>Kategorie</span>
			<select name="categoryId" value={r.categoryId} class={input}>
				{#each data.categories as cat (cat.id)}
					<option value={cat.id}>{cat.name}</option>
					{#each cat.children as child (child.id)}
						<option value={child.id}>&nbsp;&nbsp;{child.name}</option>
					{/each}
				{/each}
			</select>
		</label>
		<label class="block">
			<span class={label}>Status</span>
			<select name="status" value={r.status} class={input}>
				{#each Object.entries(requestStatusLabels) as [value, text] (value)}
					<option {value}>{text}</option>
				{/each}
			</select>
		</label>
		<label class="block">
			<span class={label}>PLZ</span>
			<input name="plz" value={r.plz} required inputmode="numeric" maxlength="5" class={input} />
		</label>
		<label class="block">
			<span class={label}>Budget in € (leer = keins)</span>
			<input
				name="budget"
				type="number"
				min="1"
				step="0.01"
				value={r.budgetCents ? r.budgetCents / 100 : ''}
				class={input}
			/>
		</label>
		<label class="block">
			<span class={label}>Läuft ab am</span>
			<input name="expiresAt" type="date" value={isoDate(r.expiresAt)} required class={input} />
		</label>
		<div class="flex items-end sm:col-span-2">
			<button class="{button} bg-emerald-400 text-neutral-950 hover:bg-emerald-300"
				>Speichern</button
			>
		</div>
	</form>
</section>

<section class="mt-6 {card}">
	<h2 class="text-lg font-semibold">Angebote ({data.quotes.length})</h2>
	{#if data.quotes.some((q) => q.orderId)}
		<p class="mt-1 text-sm text-neutral-400">
			Bei einem Angebot mit Auftrag ändert sich der Preis des Auftrags nicht mit.
		</p>
	{/if}
	<div class="mt-4 space-y-4">
		{#each data.quotes as { quote: q, repairerName, orderId, orderStatus } (q.id)}
			<form method="post" action="?/quote" use:enhance class="rounded-lg bg-raised p-4">
				<input type="hidden" name="quoteId" value={q.id} />
				<div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
					<a href="/admin/nutzer/{q.repairerId}" class="font-semibold hover:underline"
						>{repairerName}</a
					>
					{#if orderId && orderStatus}
						<a href="/admin/auftraege/{orderId}" class="ml-auto">
							<StatusBadge status={orderStatus} label="Auftrag: {orderStatusLabels[orderStatus]}" />
						</a>
					{/if}
				</div>
				<div class="grid gap-3 sm:grid-cols-4">
					<label class="block">
						<span class={label}>Preis in €</span>
						<input
							name="price"
							type="number"
							min="1"
							step="0.01"
							value={q.priceCents / 100}
							class={input}
						/>
					</label>
					<label class="block">
						<span class={label}>Dauer (Tage)</span>
						<input
							name="estimatedDays"
							type="number"
							min="1"
							value={q.estimatedDays}
							class={input}
						/>
					</label>
					<label class="block">
						<span class={label}>Status</span>
						<select name="status" value={q.status} class={input}>
							{#each Object.entries(quoteStatusLabels) as [value, text] (value)}
								<option {value}>{text}</option>
							{/each}
						</select>
					</label>
					<label class="block">
						<span class={label}>Gültig bis</span>
						<input name="validUntil" type="date" value={isoDate(q.validUntil)} class={input} />
					</label>
					<label class="block sm:col-span-4">
						<span class={label}>Nachricht</span>
						<textarea name="message" rows="2" maxlength="5000" class={input}>{q.message}</textarea>
					</label>
				</div>
				<button class="mt-3 {button} bg-surface hover:bg-edge">Angebot speichern</button>
			</form>
		{:else}
			<p class="text-sm text-neutral-400">Noch keine Angebote.</p>
		{/each}
	</div>
</section>

<section class="mt-6 rounded-xl bg-surface p-6 ring-1 ring-red-400/30">
	<h2 class="text-lg font-semibold text-red-300">Anfrage löschen</h2>
	<p class="mt-1 text-sm text-neutral-400">
		Löscht auch Fotos, Angebote, Aufträge und Chats dieser Anfrage. Stripe wird nicht angepasst.
	</p>
	<form method="post" action="?/delete" use:enhance class="mt-4">
		<ConfirmButton
			label="Anfrage löschen"
			message="„{r.title}“ mit allem Drumherum endgültig löschen?"
			class="inline-block {button} bg-red-500 text-neutral-950 hover:bg-red-400"
		/>
	</form>
</section>
