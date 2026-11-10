<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { formatCents } from '#lib/money.ts';
	import { handoverLabels } from '#lib/handover.ts';
	import { orderStatusLabels } from '#lib/status.ts';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import Stars from '#lib/components/Stars.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const order = $derived(data.order);
	const isCustomer = $derived(data.role === 'customer');
	const isShipping = $derived(order.handoverMode === 'shipping');

	const confirmCancel: SubmitFunction = ({ cancel }) => {
		if (!confirm('Auftrag wirklich stornieren?')) cancel();
	};

	const reviews = $derived(data.reviews);
	const otherName = $derived(isCustomer ? data.repairerName : data.customerName);
	// Star picker; the radios stay real inputs, so it also works with the keyboard and without JS.
	let rating = $state(0);
	let hovered = $state(0);
	const ratingWords = ['', 'Schlecht', 'Mäßig', 'Okay', 'Gut', 'Sehr gut'];

	const button = 'rounded-md px-4 py-2 text-sm font-medium';
	const primary = `${button} bg-emerald-600 text-white hover:bg-emerald-700`;
</script>

<svelte:head><title>Auftrag: {data.requestTitle} – RepairHub</title></svelte:head>

<a href="/auftraege" class="text-sm text-emerald-700 hover:underline">← Meine Aufträge</a>

<div class="mt-4 grid gap-6 lg:grid-cols-3">
	<div class="space-y-6 lg:col-span-2">
		<section class="rounded-lg border border-stone-200 bg-white p-6">
			<div class="flex flex-wrap items-start justify-between gap-2">
				<div>
					<h1 class="text-2xl font-bold">{data.requestTitle}</h1>
					<p class="mt-1 text-sm text-stone-500">
						<a href="/anfragen/{order.requestId}" class="hover:underline">Zur Anfrage</a>
						· {data.requestPlz}
						{data.requestCity}
					</p>
				</div>
				<div class="flex items-center gap-3">
					{#if data.conversationId}
						<a
							href="/nachrichten/{data.conversationId}"
							class="rounded-md border border-stone-300 px-3 py-1 text-sm font-medium hover:border-emerald-500"
						>
							Chat
						</a>
					{/if}
					<StatusBadge status={order.status} label={orderStatusLabels[order.status]} />
				</div>
			</div>

			<dl class="mt-6 grid gap-4 text-sm sm:grid-cols-2">
				<div>
					<dt class="text-stone-500">Auftraggeber</dt>
					<dd>
						<a href="/nutzer/{data.order.customerId}" class="hover:underline">{data.customerName}</a
						>{isCustomer ? ' (du)' : ''}
					</dd>
				</div>
				<div>
					<dt class="text-stone-500">Reparateur</dt>
					<dd>
						<a href="/nutzer/{data.order.repairerId}" class="hover:underline">{data.repairerName}</a
						>{isCustomer ? '' : ' (du)'}
					</dd>
				</div>
				<div>
					<dt class="text-stone-500">Übergabe</dt>
					<dd>
						{handoverLabels[order.handoverMode]}
						{#if isShipping}
							· Rückversand {data.quoteIncludesReturnShipping ? 'inklusive' : 'nicht inklusive'}
						{/if}
					</dd>
				</div>
				<div>
					<dt class="text-stone-500">Geschätzte Dauer</dt>
					<dd>ca. {data.quoteEstimatedDays} {data.quoteEstimatedDays === 1 ? 'Tag' : 'Tage'}</dd>
				</div>
				{#if order.outboundTracking}
					<div>
						<dt class="text-stone-500">Sendungsnr. Hinweg</dt>
						<dd>{order.outboundTracking}</dd>
					</div>
				{/if}
				{#if order.returnTracking}
					<div>
						<dt class="text-stone-500">Sendungsnr. Rückweg</dt>
						<dd>{order.returnTracking}</dd>
					</div>
				{/if}
			</dl>

			<div class="mt-6 border-t border-stone-100 pt-4 text-sm">
				<p class="text-stone-500">Angebot</p>
				<p class="mt-1 whitespace-pre-line">{data.quoteMessage}</p>
				{#if data.quotePartsNote}
					<p class="mt-1 text-stone-600">Teile: {data.quotePartsNote}</p>
				{/if}
			</div>
		</section>

		<section class="rounded-lg border border-stone-200 bg-white p-6">
			<h2 class="mb-3 text-lg font-semibold">Nächster Schritt</h2>

			{#if form?.message}
				<p class="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{form.message}</p>
			{/if}

			{#if order.status === 'paid'}
				{#if isCustomer}
					<p class="text-sm text-stone-600">
						{#if isShipping}
							Schicke das Gerät an {data.repairerName} und trage die Sendungsnummer ein.
						{:else if order.handoverMode === 'dropoff'}
							Vereinbare mit {data.repairerName} einen Termin zur Abgabe.
						{:else}
							Vereinbare mit {data.repairerName} einen Termin für den Besuch bei dir.
						{/if}
						Stimmt die Details im Chat ab. Adressen folgen in einer späteren Version.
					</p>
				{:else}
					<p class="mb-3 text-sm text-stone-600">
						Sobald du das Gerät hast (oder beim Kunden bist), starte die Reparatur.
					</p>
					<form method="post" action="?/start" use:enhance>
						<button class={primary}>Gerät erhalten – Reparatur beginnen</button>
					</form>
				{/if}
			{:else if order.status === 'in_progress'}
				{#if isCustomer}
					<p class="text-sm text-stone-600">{data.repairerName} repariert gerade dein Gerät.</p>
				{:else}
					<form method="post" action="?/repaired" use:enhance class="space-y-3">
						{#if isShipping}
							<label class="block">
								<span class="text-sm font-medium">Sendungsnummer Rückversand (optional)</span>
								<input
									name="returnTracking"
									maxlength="100"
									class="mt-1 w-full rounded-md border-stone-300"
								/>
							</label>
						{/if}
						<button class={primary}>Als repariert markieren</button>
					</form>
				{/if}
			{:else if order.status === 'repaired'}
				{#if isCustomer}
					<p class="mb-3 text-sm text-stone-600">
						{data.repairerName} hat die Reparatur abgeschlossen. Bitte bestätige, sobald du dein Gerät
						zurück hast und alles funktioniert.
						{#if order.autoConfirmAt}
							Ohne Rückmeldung wird der Auftrag am {order.autoConfirmAt.toLocaleDateString('de-DE')}
							automatisch abgeschlossen.
						{/if}
					</p>
					<form method="post" action="?/confirm" use:enhance>
						<button class={primary}>Reparatur bestätigen</button>
					</form>
				{:else}
					<p class="text-sm text-stone-600">Warte auf die Bestätigung von {data.customerName}.</p>
				{/if}
			{:else if order.status === 'completed'}
				<p class="text-sm text-stone-600">Der Auftrag ist abgeschlossen. Danke! 🎉</p>
			{:else if order.status === 'cancelled'}
				<p class="text-sm text-stone-600">Der Auftrag wurde storniert.</p>
			{:else}
				<p class="text-sm text-stone-600">{orderStatusLabels[order.status]}</p>
			{/if}

			{#if order.status === 'paid' && isCustomer && isShipping}
				<form method="post" action="?/tracking" use:enhance class="mt-4 flex gap-2">
					<input
						name="outboundTracking"
						maxlength="100"
						placeholder="Sendungsnummer"
						value={order.outboundTracking ?? ''}
						class="min-w-0 flex-1 rounded-md border-stone-300"
					/>
					<button class="{button} border border-stone-300 hover:border-emerald-500">
						Speichern
					</button>
				</form>
			{/if}

			{#if order.status === 'paid'}
				<details class="mt-6 border-t border-stone-100 pt-4 text-sm">
					<summary class="cursor-pointer text-stone-500 hover:text-stone-800">
						Auftrag stornieren
					</summary>
					<form method="post" action="?/cancel" use:enhance={confirmCancel} class="mt-3 space-y-2">
						<textarea
							name="reason"
							rows="2"
							maxlength="500"
							placeholder="Grund (optional)"
							class="w-full rounded-md border-stone-300"></textarea>
						<button class="{button} bg-red-600 text-white hover:bg-red-700">Stornieren</button>
						<p class="text-xs text-stone-500">
							Möglich, solange die Reparatur noch nicht begonnen hat. Die Anfrage wird wieder
							geöffnet: Die anderen Angebote können erneut angenommen werden, und es können neue
							Angebote eingehen.
						</p>
					</form>
				</details>
			{/if}
		</section>

		{#if order.status === 'completed'}
			<section class="rounded-lg border border-stone-200 bg-white p-6">
				<h2 class="mb-3 text-lg font-semibold">Bewertung</h2>

				{#if reviews.own}
					<div class="text-sm">
						<p class="text-stone-500">Deine Bewertung für {otherName}</p>
						<div class="mt-1"><Stars rating={reviews.own.rating} /></div>
						{#if reviews.own.text}
							<p class="mt-1 whitespace-pre-line">{reviews.own.text}</p>
						{/if}
						{#if !reviews.own.publishedAt && reviews.windowEnd}
							<p class="mt-2 text-xs text-stone-500">
								Noch nicht öffentlich. Sie erscheint, sobald {otherName} dich auch bewertet hat, spätestens
								am {reviews.windowEnd.toLocaleDateString('de-DE')}.
							</p>
						{/if}
					</div>
				{:else if reviews.canReview}
					<form method="post" action="?/review" use:enhance class="space-y-3">
						<fieldset>
							<legend class="text-sm font-medium">Wie war es mit {otherName}?</legend>
							<div class="mt-1 flex items-center gap-1" role="presentation">
								{#each [1, 2, 3, 4, 5] as n (n)}
									<label
										class="cursor-pointer text-3xl leading-none {n <= (hovered || rating)
											? 'text-amber-500'
											: 'text-stone-300'}"
										onmouseenter={() => (hovered = n)}
										onmouseleave={() => (hovered = 0)}
									>
										<input
											type="radio"
											name="rating"
											value={n}
											bind:group={rating}
											class="peer sr-only"
										/>
										<span
											class="rounded peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-500"
											aria-hidden="true">★</span
										>
										<span class="sr-only">{n} {n === 1 ? 'Stern' : 'Sterne'}</span>
									</label>
								{/each}
								<span class="ml-2 text-sm text-stone-600">{ratingWords[hovered || rating]}</span>
							</div>
							{#if form && 'reviewErrors' in form && form.reviewErrors?.rating}
								<p class="mt-1 text-sm text-red-600">{form.reviewErrors.rating}</p>
							{/if}
						</fieldset>
						<label class="block">
							<span class="text-sm font-medium">Kommentar (optional)</span>
							<textarea
								name="text"
								rows="3"
								maxlength="1000"
								placeholder={isCustomer
									? 'Wie war die Reparatur, die Kommunikation, die Dauer?'
									: 'Wie lief die Zusammenarbeit?'}
								class="mt-1 w-full rounded-md border-stone-300"
								>{form && 'reviewValues' in form ? (form.reviewValues?.text ?? '') : ''}</textarea
							>
							{#if form && 'reviewErrors' in form && form.reviewErrors?.text}
								<p class="mt-1 text-sm text-red-600">{form.reviewErrors.text}</p>
							{/if}
						</label>
						<button class={primary}>Bewertung abgeben</button>
						<p class="text-xs text-stone-500">
							Deine Bewertung bleibt verborgen, bis {otherName} auch bewertet hat oder bis zum
							{reviews.windowEnd?.toLocaleDateString('de-DE')}. So kann niemand auf die Bewertung
							des anderen reagieren.
						</p>
					</form>
				{:else}
					<p class="text-sm text-stone-500">Der Zeitraum zum Bewerten ist vorbei.</p>
				{/if}

				{#if reviews.other}
					<div class="mt-4 border-t border-stone-100 pt-4 text-sm">
						<p class="text-stone-500">{otherName} über dich</p>
						<div class="mt-1"><Stars rating={reviews.other.rating} /></div>
						{#if reviews.other.text}
							<p class="mt-1 whitespace-pre-line">{reviews.other.text}</p>
						{/if}
					</div>
				{:else if reviews.otherIsHidden}
					<p class="mt-4 border-t border-stone-100 pt-4 text-sm text-stone-600">
						{otherName} hat dich bewertet. Du siehst die Bewertung, sobald du selbst bewertet hast{reviews.windowEnd
							? ` oder am ${reviews.windowEnd.toLocaleDateString('de-DE')}`
							: ''}.
					</p>
				{/if}
			</section>
		{/if}
	</div>

	<aside class="space-y-6">
		<section class="rounded-lg border border-stone-200 bg-white p-6 text-sm">
			<h2 class="mb-3 text-lg font-semibold">Preis</h2>
			<dl class="space-y-1">
				<div class="flex justify-between">
					<dt>Reparaturpreis</dt>
					<dd class="font-semibold">{formatCents(order.priceCents)}</dd>
				</div>
				{#if !isCustomer}
					<div class="flex justify-between text-stone-600">
						<dt>Provision ({order.commissionRateBp / 100} %)</dt>
						<dd>−{formatCents(order.commissionCents)}</dd>
					</div>
					<div class="flex justify-between border-t border-stone-100 pt-1 font-semibold">
						<dt>Auszahlung an dich</dt>
						<dd>{formatCents(order.payoutCents)}</dd>
					</div>
				{/if}
			</dl>
			<p class="mt-3 text-xs text-stone-500">Testbetrieb: Es wird kein echtes Geld bewegt.</p>
		</section>

		<section class="rounded-lg border border-stone-200 bg-white p-6 text-sm">
			<h2 class="mb-3 text-lg font-semibold">Verlauf</h2>
			<ol class="space-y-3 border-l border-stone-200 pl-4">
				{#each data.events as event (event.id)}
					<li>
						<div class="font-medium">{orderStatusLabels[event.toStatus]}</div>
						<div class="text-xs text-stone-500">
							{event.createdAt.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
							· {event.actorName ?? 'System'}
						</div>
						{#if event.note}
							<div class="mt-0.5 text-stone-600">{event.note}</div>
						{/if}
					</li>
				{/each}
			</ol>
		</section>
	</aside>
</div>
