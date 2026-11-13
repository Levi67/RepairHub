<script lang="ts">
	import ConfirmButton from '#lib/components/ConfirmButton.svelte';
	import { enhance } from '$app/forms';
	import { formatCents } from '#lib/money.ts';
	import { handoverLabels } from '#lib/handover.ts';
	import { orderStatusLabels } from '#lib/status.ts';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import Stars from '#lib/components/Stars.svelte';
	import CreditCard from 'phosphor-svelte/lib/CreditCard';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const order = $derived(data.order);
	const isCustomer = $derived(data.role === 'customer');
	const isShipping = $derived(order.handoverMode === 'shipping');

	const reviews = $derived(data.reviews);
	const otherName = $derived(isCustomer ? data.repairerName : data.customerName);
	// Star picker; the radios stay real inputs, so it also works with the keyboard and without JS.
	let rating = $state(0);
	let hovered = $state(0);
	const ratingWords = ['', 'Schlecht', 'Mäßig', 'Okay', 'Gut', 'Sehr gut'];

	const button = 'rounded-md px-3 py-2 text-sm font-semibold';
	const primary = `${button} bg-emerald-400 text-neutral-950 hover:bg-emerald-300`;
</script>

<svelte:head><title>Auftrag: {data.requestTitle} – RepairHub</title></svelte:head>

<a href="/auftraege" class="text-sm text-emerald-400 hover:underline">← Meine Aufträge</a>

<div class="mt-4 grid gap-6 lg:grid-cols-3">
	<div class="space-y-6 lg:col-span-2">
		<section class="rounded-xl bg-surface p-6">
			<div class="flex flex-wrap items-start justify-between gap-2">
				<div>
					<h1 class="text-3xl font-semibold tracking-tight">{data.requestTitle}</h1>
					<p class="mt-1 text-sm text-neutral-400">
						<a href="/anfragen/{order.requestId}" class="hover:underline">Zur Anfrage</a>
						· {data.requestPlz}
						{data.requestCity}
					</p>
				</div>
				<div class="flex items-center gap-3">
					{#if data.conversationId}
						<a
							href="/nachrichten/{data.conversationId}"
							class="rounded-md bg-raised px-3 py-1 text-sm font-semibold hover:bg-edge"
						>
							Chat
						</a>
					{/if}
					<StatusBadge status={order.status} label={orderStatusLabels[order.status]} />
				</div>
			</div>

			<dl class="mt-6 grid gap-4 text-sm sm:grid-cols-2">
				<div>
					<dt class="text-neutral-400">Auftraggeber</dt>
					<dd>
						<a href="/nutzer/{data.order.customerId}" class="hover:underline">{data.customerName}</a
						>{isCustomer ? ' (du)' : ''}
					</dd>
				</div>
				<div>
					<dt class="text-neutral-400">Reparateur</dt>
					<dd>
						<a href="/nutzer/{data.order.repairerId}" class="hover:underline">{data.repairerName}</a
						>{isCustomer ? '' : ' (du)'}
					</dd>
				</div>
				<div>
					<dt class="text-neutral-400">Übergabe</dt>
					<dd>
						{handoverLabels[order.handoverMode]}
						{#if isShipping}
							· Rückversand {data.quoteIncludesReturnShipping ? 'inklusive' : 'nicht inklusive'}
						{/if}
					</dd>
				</div>
				<div>
					<dt class="text-neutral-400">Geschätzte Dauer</dt>
					<dd>ca. {data.quoteEstimatedDays} {data.quoteEstimatedDays === 1 ? 'Tag' : 'Tage'}</dd>
				</div>
				{#if order.outboundTracking}
					<div>
						<dt class="text-neutral-400">Sendungsnr. Hinweg</dt>
						<dd>{order.outboundTracking}</dd>
					</div>
				{/if}
				{#if order.returnTracking}
					<div>
						<dt class="text-neutral-400">Sendungsnr. Rückweg</dt>
						<dd>{order.returnTracking}</dd>
					</div>
				{/if}
			</dl>

			<div class="mt-6 border-t border-edge pt-4 text-sm">
				<p class="text-neutral-400">Angebot</p>
				<p class="mt-1 whitespace-pre-line">{data.quoteMessage}</p>
				{#if data.quotePartsNote}
					<p class="mt-1 text-neutral-300">Teile: {data.quotePartsNote}</p>
				{/if}
			</div>
		</section>

		<section class="rounded-xl bg-surface p-6">
			<h2 class="mb-3 text-lg font-semibold">Nächster Schritt</h2>

			{#if form?.message}
				<p class="mb-3 rounded-md bg-red-400/10 p-3 text-sm text-red-400">{form.message}</p>
			{:else if data.paymentNotice === 'fehler' && order.status === 'awaiting_payment'}
				<p class="mb-3 rounded-md bg-red-400/10 p-3 text-sm text-red-400">
					Die Zahlungsseite von Stripe ließ sich gerade nicht öffnen. Versuch es in einem Moment
					noch einmal.
				</p>
			{/if}

			{#if order.status === 'awaiting_payment'}
				{#if isCustomer}
					{#if data.paymentNotice === 'erfolgreich'}
						<p class="text-sm text-neutral-300">
							Danke! Stripe bestätigt deine Zahlung gerade. Lade die Seite in ein paar Sekunden neu.
						</p>
					{:else}
						<p class="mb-3 text-sm text-neutral-300">
							Bezahle {formatCents(order.priceCents)}, damit {data.repairerName} loslegen kann. Das Geld
							bleibt bei RepairHub, bis du die Reparatur bestätigst. Storniert ihr vor Beginn, bekommst
							du alles zurück.
						</p>
						<!-- No use:enhance: this leaves the site for Stripe Checkout. -->
						<form method="post" action="?/pay">
							<button class="{primary} inline-flex items-center gap-2">
								<CreditCard size={18} weight="bold" />
								Jetzt bezahlen
							</button>
						</form>
					{/if}
				{:else}
					<p class="text-sm text-neutral-300">
						{data.customerName} hat dein Angebot angenommen und bezahlt gerade. Sobald die Zahlung da
						ist, kann es losgehen.
					</p>
				{/if}
			{:else if order.status === 'paid'}
				{#if isCustomer}
					<p class="text-sm text-neutral-300">
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
					<p class="mb-3 text-sm text-neutral-300">
						Sobald du das Gerät hast (oder beim Kunden bist), starte die Reparatur.
					</p>
					<form method="post" action="?/start" use:enhance>
						<button class={primary}>Gerät erhalten – Reparatur beginnen</button>
					</form>
				{/if}
			{:else if order.status === 'in_progress'}
				{#if isCustomer}
					<p class="text-sm text-neutral-300">{data.repairerName} repariert gerade dein Gerät.</p>
				{:else}
					<form method="post" action="?/repaired" use:enhance class="space-y-3">
						{#if isShipping}
							<label class="block">
								<span class="text-sm font-medium">Sendungsnummer Rückversand (optional)</span>
								<input
									name="returnTracking"
									maxlength="100"
									class="mt-1 w-full rounded-md border-edge"
								/>
							</label>
						{/if}
						<button class={primary}>Als repariert markieren</button>
					</form>
				{/if}
			{:else if order.status === 'repaired'}
				{#if isCustomer}
					<p class="mb-3 text-sm text-neutral-300">
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
					<p class="text-sm text-neutral-300">Warte auf die Bestätigung von {data.customerName}.</p>
				{/if}
			{:else if order.status === 'completed'}
				<p class="text-sm text-neutral-300">
					Der Auftrag ist abgeschlossen. Danke!
					{#if !isCustomer && data.payment.paidOut}
						{formatCents(order.payoutCents)} sind an dein Auszahlungskonto unterwegs.
					{/if}
				</p>
				{#if !isCustomer && data.payment.payoutHeld}
					<p class="mt-3 text-sm text-neutral-300">
						Deine Auszahlung von {formatCents(order.payoutCents)} wartet auf dein Auszahlungskonto.
						<a href="/profil/auszahlungen" class="font-semibold text-emerald-400 hover:underline">
							Auszahlungen einrichten
						</a>
					</p>
				{/if}
			{:else if order.status === 'cancelled'}
				<p class="text-sm text-neutral-300">
					Der Auftrag wurde storniert.
					{#if data.payment.refunded}
						{isCustomer ? 'Du bekommst' : `${data.customerName} bekommt`}
						{formatCents(order.priceCents)} zurück.
					{/if}
				</p>
			{:else}
				<p class="text-sm text-neutral-300">{orderStatusLabels[order.status]}</p>
			{/if}

			{#if order.status === 'paid' && isCustomer && isShipping}
				<form method="post" action="?/tracking" use:enhance class="mt-4 flex gap-2">
					<input
						name="outboundTracking"
						maxlength="100"
						placeholder="Sendungsnummer"
						value={order.outboundTracking ?? ''}
						class="min-w-0 flex-1 rounded-md border-edge"
					/>
					<button class="{button} bg-raised hover:bg-edge"> Speichern </button>
				</form>
			{/if}

			{#if order.status === 'paid' || (order.status === 'awaiting_payment' && isCustomer)}
				<details class="mt-6 border-t border-edge pt-4 text-sm">
					<summary class="cursor-pointer text-neutral-400 hover:text-neutral-100">
						{order.status === 'awaiting_payment' ? 'Doch nicht bezahlen' : 'Auftrag stornieren'}
					</summary>
					<form method="post" action="?/cancel" use:enhance class="mt-3 space-y-2">
						<textarea
							name="reason"
							rows="2"
							maxlength="500"
							placeholder="Grund (optional)"
							class="w-full rounded-md border-edge"></textarea>
						<ConfirmButton
							label="Stornieren"
							message={data.payment.viaStripe
								? `Auftrag wirklich stornieren? ${formatCents(order.priceCents)} werden vollständig erstattet, und die Anfrage wird wieder geöffnet.`
								: 'Auftrag wirklich stornieren? Die Anfrage wird danach wieder geöffnet.'}
							class="inline-block {button} bg-red-500 text-neutral-950 hover:bg-red-400"
						/>
						<p class="text-xs text-neutral-400">
							Möglich, solange die Reparatur noch nicht begonnen hat.
							{#if data.payment.viaStripe}Die Zahlung wird vollständig erstattet.{/if}
							Die Anfrage wird wieder geöffnet: Die anderen Angebote können erneut angenommen werden,
							und es können neue Angebote eingehen.
						</p>
					</form>
				</details>
			{/if}
		</section>

		{#if order.status === 'completed'}
			<section class="rounded-xl bg-surface p-6">
				<h2 class="mb-3 text-lg font-semibold">Bewertung</h2>

				{#if reviews.own}
					<div class="text-sm">
						<p class="text-neutral-400">Deine Bewertung für {otherName}</p>
						<div class="mt-1"><Stars rating={reviews.own.rating} /></div>
						{#if reviews.own.text}
							<p class="mt-1 whitespace-pre-line">{reviews.own.text}</p>
						{/if}
						{#if !reviews.own.publishedAt && reviews.windowEnd}
							<p class="mt-2 text-xs text-neutral-400">
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
											? 'text-amber-400'
											: 'text-neutral-600'}"
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
											class="rounded peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-400"
											aria-hidden="true">★</span
										>
										<span class="sr-only">{n} {n === 1 ? 'Stern' : 'Sterne'}</span>
									</label>
								{/each}
								<span class="ml-2 text-sm text-neutral-300">{ratingWords[hovered || rating]}</span>
							</div>
							{#if form && 'reviewErrors' in form && form.reviewErrors?.rating}
								<p class="mt-1 text-sm text-red-400">{form.reviewErrors.rating}</p>
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
								class="mt-1 w-full rounded-md border-edge"
								>{form && 'reviewValues' in form ? (form.reviewValues?.text ?? '') : ''}</textarea
							>
							{#if form && 'reviewErrors' in form && form.reviewErrors?.text}
								<p class="mt-1 text-sm text-red-400">{form.reviewErrors.text}</p>
							{/if}
						</label>
						<button class={primary}>Bewertung abgeben</button>
						<p class="text-xs text-neutral-400">
							Deine Bewertung bleibt verborgen, bis {otherName} auch bewertet hat oder bis zum
							{reviews.windowEnd?.toLocaleDateString('de-DE')}. So kann niemand auf die Bewertung
							des anderen reagieren.
						</p>
					</form>
				{:else}
					<p class="text-sm text-neutral-400">Der Zeitraum zum Bewerten ist vorbei.</p>
				{/if}

				{#if reviews.other}
					<div class="mt-4 border-t border-edge pt-4 text-sm">
						<p class="text-neutral-400">{otherName} über dich</p>
						<div class="mt-1"><Stars rating={reviews.other.rating} /></div>
						{#if reviews.other.text}
							<p class="mt-1 whitespace-pre-line">{reviews.other.text}</p>
						{/if}
					</div>
				{:else if reviews.otherIsHidden}
					<p class="mt-4 border-t border-edge pt-4 text-sm text-neutral-300">
						{otherName} hat dich bewertet. Du siehst die Bewertung, sobald du selbst bewertet hast{reviews.windowEnd
							? ` oder am ${reviews.windowEnd.toLocaleDateString('de-DE')}`
							: ''}.
					</p>
				{/if}
			</section>
		{/if}
	</div>

	<aside class="space-y-6">
		<section class="rounded-xl bg-surface p-6 text-sm">
			<h2 class="mb-3 text-lg font-semibold">Preis</h2>
			<dl class="space-y-1">
				<div class="flex justify-between">
					<dt>Reparaturpreis</dt>
					<dd class="font-semibold">{formatCents(order.priceCents)}</dd>
				</div>
				{#if !isCustomer}
					<div class="flex justify-between text-neutral-300">
						<dt>Provision ({order.commissionRateBp / 100} %)</dt>
						<dd>−{formatCents(order.commissionCents)}</dd>
					</div>
					<div class="flex justify-between border-t border-edge pt-1 font-semibold">
						<dt>Auszahlung an dich</dt>
						<dd>{formatCents(order.payoutCents)}</dd>
					</div>
				{/if}
			</dl>
			<p class="mt-3 border-t border-edge pt-3 text-neutral-300">
				{#if order.status === 'awaiting_payment'}
					Noch nicht bezahlt.
				{:else if data.payment.refunded}
					Zahlung erstattet.
				{:else if !data.payment.viaStripe}
					Ohne Zahlung angelegt (Stripe war nicht eingerichtet).
				{:else if isCustomer}
					Bezahlt. RepairHub hält das Geld, bis du die Reparatur bestätigst.
				{:else if data.payment.paidOut}
					An dich ausgezahlt.
				{:else if data.payment.payoutHeld}
					Auszahlung wartet auf dein Auszahlungskonto.
				{:else}
					Bezahlt. Du bekommst das Geld, sobald {data.customerName} die Reparatur bestätigt.
				{/if}
			</p>
			<p class="mt-2 text-xs text-neutral-400">Testbetrieb: Es wird kein echtes Geld bewegt.</p>
		</section>

		<section class="rounded-xl bg-surface p-6 text-sm">
			<h2 class="mb-3 text-lg font-semibold">Verlauf</h2>
			<ol class="space-y-3 border-l border-edge pl-4">
				{#each data.events as event (event.id)}
					<li>
						<div class="font-medium">{orderStatusLabels[event.toStatus]}</div>
						<div class="text-xs text-neutral-400">
							{event.createdAt.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
							· {event.actorName ?? 'System'}
						</div>
						{#if event.note}
							<div class="mt-0.5 text-neutral-300">{event.note}</div>
						{/if}
					</li>
				{/each}
			</ol>
		</section>
	</aside>
</div>
