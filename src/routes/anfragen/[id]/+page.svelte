<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { formatCents } from '#lib/money.ts';
	import { handoverLabels } from '#lib/handover.ts';
	import { quoteDisplayStatus, requestStatusLabels } from '#lib/status.ts';
	import Avatar from '#lib/components/Avatar.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const request = $derived(data.request);
	const values = $derived(form?.values);
	const errors = $derived<Record<string, string>>(form?.errors ?? {});

	const now = new Date();
	const isOpen = $derived(request.status === 'open' && request.expiresAt > now);
	const ownQuoteIsActive = $derived(
		data.ownQuote?.status === 'pending' && data.ownQuote.validUntil > now
	);
	const ownQuoteDisplay = $derived(data.ownQuote && quoteDisplayStatus(data.ownQuote, now));
	// Accepted and the order is still running: the repairer sees their quote and the order link.
	const ownQuoteIsAccepted = $derived(
		data.ownQuote?.status === 'accepted' && data.ownQuote.orderStatus !== 'cancelled'
	);
	const canQuote = $derived(page.data.user && !data.isOwner && isOpen && !ownQuoteIsActive);
</script>

<svelte:head><title>{request.title} – RepairHub</title></svelte:head>

{#snippet error(field: string)}
	{#if errors[field]}
		<p class="mt-1 text-sm text-red-600">{errors[field]}</p>
	{/if}
{/snippet}

{#snippet quoteDetails(q: NonNullable<typeof data.ownQuote> | (typeof data.quotes)[number])}
	<div class="flex flex-wrap items-baseline gap-x-4 gap-y-1">
		<span class="text-xl font-bold">{formatCents(q.priceCents)}</span>
		<span class="text-sm text-stone-600">
			ca. {q.estimatedDays}
			{q.estimatedDays === 1 ? 'Tag' : 'Tage'} · {handoverLabels[q.handoverMode]}
			{#if q.handoverMode === 'shipping'}
				· Rückversand {q.includesReturnShipping ? 'inklusive' : 'nicht inklusive'}
			{/if}
		</span>
	</div>
	<p class="mt-2 text-sm whitespace-pre-line">{q.message}</p>
	{#if q.partsNote}
		<p class="mt-1 text-sm text-stone-600">Teile: {q.partsNote}</p>
	{/if}
{/snippet}

<a href="/anfragen" class="text-sm text-emerald-700 hover:underline">← Alle Anfragen</a>

<article class="mt-4 rounded-lg border border-stone-200 bg-white p-6">
	<div class="flex items-center justify-between gap-2">
		<div class="text-xs font-medium tracking-wide text-emerald-700 uppercase">
			{request.categoryName}
		</div>
		{#if request.status !== 'open'}
			<StatusBadge status={request.status} label={requestStatusLabels[request.status]} />
		{/if}
	</div>
	<h1 class="mt-1 text-2xl font-bold">{request.title}</h1>
	<p class="mt-1 text-sm text-stone-500">
		von <a href="/nutzer/{request.customerId}" class="hover:underline">{request.customerName}</a> · {request.createdAt.toLocaleDateString(
			'de-DE'
		)} · {request.plz}
		{request.city}
	</p>

	<p class="mt-6 whitespace-pre-line">{request.description}</p>

	<dl class="mt-6 grid gap-4 border-t border-stone-100 pt-6 text-sm sm:grid-cols-2">
		{#if request.brand || request.model}
			<div>
				<dt class="text-stone-500">Gerät</dt>
				<dd>{[request.brand, request.model].filter(Boolean).join(' ')}</dd>
			</div>
		{/if}
		<div>
			<dt class="text-stone-500">Übergabe</dt>
			<dd>{request.handoverModes.map((m) => handoverLabels[m]).join(', ')}</dd>
		</div>
		<div>
			<dt class="text-stone-500">Budget</dt>
			<dd>
				{request.budgetCents ? `bis ca. ${formatCents(request.budgetCents)}` : 'keine Angabe'}
			</dd>
		</div>
		<div>
			<dt class="text-stone-500">Läuft ab am</dt>
			<dd>{request.expiresAt.toLocaleDateString('de-DE')}</dd>
		</div>
	</dl>
</article>

{#if form?.message}
	<p class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{form.message}</p>
{/if}

{#if data.isOwner}
	<section class="mt-8">
		<h2 class="mb-3 text-xl font-semibold">Angebote ({data.quotes.length})</h2>

		{#if data.orderId}
			<a
				href="/auftraege/{data.orderId}"
				class="mb-4 block rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-800 hover:bg-emerald-100"
			>
				Du hast ein Angebot angenommen. <strong>Zum Auftrag →</strong>
			</a>
		{/if}

		{#if data.quotes.length}
			<div class="space-y-3">
				{#each data.quotes as q (q.id)}
					{@const display = quoteDisplayStatus(q, now)}
					<div class="rounded-lg border border-stone-200 bg-white p-4">
						<div class="mb-2 flex items-center justify-between gap-2">
							<a
								href="/nutzer/{q.repairerId}"
								class="flex items-center gap-2 font-medium hover:underline"
							>
								<Avatar name={q.repairerName} image={q.repairerImage} size="sm" />
								{q.repairerName}
							</a>
							<div class="flex items-center gap-3">
								{#if q.conversationId}
									<a
										href="/nachrichten/{q.conversationId}"
										class="text-sm text-emerald-700 hover:underline"
									>
										Nachricht
									</a>
								{/if}
								<StatusBadge {...display} />
							</div>
						</div>
						{@render quoteDetails(q)}
						{#if display.status === 'pending' && isOpen}
							<div
								class="mt-3 flex items-center justify-between gap-2 border-t border-stone-100 pt-3"
							>
								<span class="text-xs text-stone-500">
									gültig bis {q.validUntil.toLocaleDateString('de-DE')}
								</span>
								<form method="post" action="?/accept" use:enhance>
									<input type="hidden" name="quoteId" value={q.id} />
									<button
										class="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
									>
										Angebot annehmen
									</button>
								</form>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p class="rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-500">
				Noch keine Angebote. Reparateure in deiner Nähe können deine Anfrage jetzt sehen.
			</p>
		{/if}
	</section>
{:else}
	<section class="mt-8">
		{#if data.conversationId}
			<a
				href="/nachrichten/{data.conversationId}"
				class="mb-6 inline-block rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:border-emerald-500"
			>
				Chat mit {request.customerName} öffnen
			</a>
		{:else if page.data.user && isOpen}
			<form method="post" action="?/ask" use:enhance class="mb-6">
				<button
					class="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:border-emerald-500"
				>
					Frage an {request.customerName} stellen
				</button>
			</form>
		{/if}

		{#if data.ownQuote && ownQuoteDisplay && (ownQuoteIsActive || ownQuoteIsAccepted)}
			<h2 class="mb-3 text-xl font-semibold">Dein Angebot</h2>
			<div class="rounded-lg border border-stone-200 bg-white p-4">
				<div class="mb-2">
					<StatusBadge {...ownQuoteDisplay} />
				</div>
				{@render quoteDetails(data.ownQuote)}
				{#if data.ownQuote.orderId}
					<a
						href="/auftraege/{data.ownQuote.orderId}"
						class="mt-3 inline-block font-medium text-emerald-700 hover:underline"
					>
						Zum Auftrag →
					</a>
				{:else if ownQuoteIsActive}
					<form method="post" action="?/withdraw" use:enhance class="mt-3">
						<input type="hidden" name="quoteId" value={data.ownQuote.id} />
						<button class="text-sm text-stone-500 hover:text-red-600">Angebot zurückziehen</button>
					</form>
				{/if}
			</div>
		{:else if !page.data.user}
			<p class="rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-600">
				Du kannst das reparieren?
				<a
					href="/anmelden?redirectTo={encodeURIComponent(page.url.pathname)}"
					class="font-medium text-emerald-700 hover:underline">Melde dich an</a
				>, um ein Angebot abzugeben.
			</p>
		{:else if !isOpen}
			<p class="rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-500">
				Diese Anfrage nimmt keine Angebote mehr an.
			</p>
		{/if}

		{#if canQuote}
			<h2 class="mb-3 text-xl font-semibold">Angebot abgeben</h2>
			{#if data.ownQuote}
				<p class="mb-3 text-sm text-stone-500">
					Dein letztes Angebot ist {ownQuoteDisplay?.label.toLowerCase()}. Du kannst ein neues
					abgeben.
				</p>
			{/if}
			<form
				method="post"
				action="?/quote"
				use:enhance
				class="space-y-4 rounded-lg border border-stone-200 bg-white p-6"
			>
				<div class="grid gap-4 sm:grid-cols-2">
					<label class="block">
						<span class="text-sm font-medium">Preis (gesamt) *</span>
						<div class="mt-1 flex items-center gap-2">
							<input
								name="price"
								required
								inputmode="decimal"
								placeholder="89"
								value={values?.price ?? ''}
								class="w-full rounded-md border-stone-300"
							/>
							<span class="text-stone-600">€</span>
						</div>
						{@render error('price')}
					</label>
					<label class="block">
						<span class="text-sm font-medium">Dauer *</span>
						<div class="mt-1 flex items-center gap-2">
							<input
								name="estimatedDays"
								type="number"
								required
								min="1"
								max="90"
								value={values?.estimatedDays ?? ''}
								class="w-full rounded-md border-stone-300"
							/>
							<span class="text-stone-600">Tage</span>
						</div>
						{@render error('estimatedDays')}
					</label>
				</div>

				<fieldset>
					<legend class="text-sm font-medium">Übergabe *</legend>
					<div class="mt-2 flex flex-wrap gap-4">
						{#each request.handoverModes as mode, i (mode)}
							<label class="flex items-center gap-2">
								<input
									type="radio"
									name="handoverMode"
									value={mode}
									required
									checked={values ? values.handoverMode === mode : i === 0}
									class="border-stone-300 text-emerald-600"
								/>
								{handoverLabels[mode]}
							</label>
						{/each}
					</div>
					{@render error('handoverMode')}
				</fieldset>

				{#if request.handoverModes.includes('shipping')}
					<label class="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							name="includesReturnShipping"
							checked={values?.includesReturnShipping ?? false}
							class="rounded border-stone-300 text-emerald-600"
						/>
						Rückversand im Preis enthalten (nur bei Versand)
					</label>
				{/if}

				<label class="block">
					<span class="text-sm font-medium">Nachricht *</span>
					<textarea
						name="message"
						required
						rows="4"
						maxlength="2000"
						placeholder="Was wirst du machen? Hast du Rückfragen?"
						class="mt-1 w-full rounded-md border-stone-300">{values?.message ?? ''}</textarea
					>
					{@render error('message')}
				</label>

				<label class="block">
					<span class="text-sm font-medium">Ersatzteile (optional)</span>
					<input
						name="partsNote"
						maxlength="300"
						placeholder="z. B. Originaldisplay im Preis enthalten"
						value={values?.partsNote ?? ''}
						class="mt-1 w-full rounded-md border-stone-300"
					/>
					{@render error('partsNote')}
				</label>

				<p class="text-xs text-stone-500">Das Angebot ist 7 Tage gültig.</p>

				<button
					class="w-full rounded-md bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700"
				>
					Angebot senden
				</button>
			</form>
		{/if}
	</section>
{/if}
