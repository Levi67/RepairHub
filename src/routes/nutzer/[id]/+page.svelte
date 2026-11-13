<script lang="ts">
	import ConfirmButton from '#lib/components/ConfirmButton.svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import { enhance } from '$app/forms';
	import RequestCard from '#lib/components/RequestCard.svelte';
	import Stars from '#lib/components/Stars.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const profile = $derived(data.profile);
	const memberSince = $derived(
		profile.createdAt.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
	);
</script>

<svelte:head><title>{profile.name} – RepairHub</title></svelte:head>

<div class="space-y-8">
	{#if profile.bannedAt}
		<p class="rounded-lg bg-red-400/10 p-4 text-sm text-red-300">
			Gesperrt seit {profile.bannedAt.toLocaleDateString('de-DE')}. Nur Admins sehen dieses Profil.
			<a href="/admin/nutzer?q={encodeURIComponent(profile.name)}" class="font-medium underline">
				In der Nutzerverwaltung öffnen
			</a>
		</p>
	{/if}
	<section class="flex flex-wrap items-center gap-6 rounded-xl bg-surface p-6">
		<Avatar name={profile.name} image={profile.image} size="lg" />
		<div class="min-w-0 flex-1">
			<h1 class="text-3xl font-semibold tracking-tight">{profile.name}</h1>
			<div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-300">
				{#if profile.city}
					<span>{profile.plz} {profile.city}</span>
				{/if}
				<span>Mitglied seit {memberSince}</span>
			</div>
			<div class="mt-2 grid gap-1 text-sm text-neutral-300 sm:grid-cols-2">
				<div>
					<strong class="text-neutral-100">{profile.completedAsRepairer}</strong>
					{profile.completedAsRepairer === 1 ? 'Reparatur' : 'Reparaturen'} durchgeführt
					{#if data.ratings.asRepairer.count}
						<div>
							<Stars
								rating={data.ratings.asRepairer.average}
								count={data.ratings.asRepairer.count}
							/>
							als Reparateur
						</div>
					{/if}
				</div>
				<div>
					<strong class="text-neutral-100">{profile.completedAsCustomer}</strong>
					{profile.completedAsCustomer === 1 ? 'Auftrag' : 'Aufträge'} als Auftraggeber
					{#if data.ratings.asCustomer.count}
						<div>
							<Stars
								rating={data.ratings.asCustomer.average}
								count={data.ratings.asCustomer.count}
							/>
							als Auftraggeber
						</div>
					{/if}
				</div>
			</div>
		</div>
		{#if data.isOwn}
			<a href="/profil" class="text-sm font-medium text-emerald-400 hover:underline">
				Profil bearbeiten
			</a>
		{/if}
	</section>

	<section>
		<h2 class="mb-2 text-lg font-semibold">Über mich</h2>
		{#if profile.bio}
			<p class="whitespace-pre-line text-neutral-200">{profile.bio}</p>
		{:else}
			<p class="text-neutral-400">Noch keine Beschreibung.</p>
		{/if}
	</section>

	<section>
		<h2 class="mb-3 text-lg font-semibold">Bewertungen ({data.reviews.length})</h2>
		{#if form?.message}
			<p class="mb-3 rounded-md bg-red-400/10 p-3 text-sm text-red-400">{form.message}</p>
		{/if}
		{#if data.reviews.length}
			<ul class="space-y-3">
				{#each data.reviews as r (r.id)}
					<li class="rounded-xl bg-surface p-4">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<div class="flex items-center gap-2">
								<Avatar name={r.authorName} image={r.authorImage} size="sm" />
								<div>
									<a href="/nutzer/{r.authorId}" class="text-sm font-medium hover:underline">
										{r.authorName}
									</a>
									<div class="text-xs text-neutral-400">
										{r.direction === 'customer_to_repairer'
											? 'als Auftraggeber über die Reparatur'
											: 'als Reparateur über den Auftrag'}
										„{r.requestTitle}“ · {r.createdAt.toLocaleDateString('de-DE')}
									</div>
								</div>
							</div>
							<Stars rating={r.rating} />
						</div>
						{#if r.text}
							<p class="mt-2 text-sm whitespace-pre-line text-neutral-200">{r.text}</p>
						{/if}
						{#if data.isAdmin}
							<form method="post" action="?/removeReview" use:enhance class="mt-2">
								<input type="hidden" name="reviewId" value={r.id} />
								<ConfirmButton
									label="Bewertung entfernen (Admin)"
									message="Diese Bewertung endgültig entfernen?"
									confirmLabel="Entfernen"
									class="text-xs text-neutral-400 hover:text-red-400"
								/>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-neutral-400">Noch keine Bewertungen.</p>
		{/if}
	</section>

	<section>
		<h2 class="mb-3 text-lg font-semibold">Offene Anfragen</h2>
		{#if data.openRequests.length}
			<div class="grid gap-3 sm:grid-cols-2">
				{#each data.openRequests as request (request.id)}
					<RequestCard {request} />
				{/each}
			</div>
		{:else}
			<p class="text-neutral-400">Keine offenen Anfragen.</p>
		{/if}
	</section>
</div>
