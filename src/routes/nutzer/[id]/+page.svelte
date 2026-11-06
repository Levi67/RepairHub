<script lang="ts">
	import Avatar from '#lib/components/Avatar.svelte';
	import RequestCard from '#lib/components/RequestCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const profile = $derived(data.profile);
	const memberSince = $derived(
		profile.createdAt.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
	);
</script>

<svelte:head><title>{profile.name} – RepairHub</title></svelte:head>

<div class="space-y-8">
	{#if profile.bannedAt}
		<p class="rounded-lg bg-red-50 p-4 text-sm text-red-800">
			Gesperrt seit {profile.bannedAt.toLocaleDateString('de-DE')}. Nur Admins sehen dieses Profil.
			<a href="/admin/nutzer?q={encodeURIComponent(profile.name)}" class="font-medium underline">
				In der Nutzerverwaltung öffnen
			</a>
		</p>
	{/if}
	<section
		class="flex flex-wrap items-center gap-6 rounded-lg border border-stone-200 bg-white p-6"
	>
		<Avatar name={profile.name} image={profile.image} size="lg" />
		<div class="min-w-0 flex-1">
			<h1 class="text-2xl font-bold">{profile.name}</h1>
			<div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
				{#if profile.city}
					<span>{profile.plz} {profile.city}</span>
				{/if}
				<span>Mitglied seit {memberSince}</span>
			</div>
			<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
				<span>
					<strong class="text-stone-900">{profile.completedAsRepairer}</strong>
					{profile.completedAsRepairer === 1 ? 'Reparatur' : 'Reparaturen'} durchgeführt
				</span>
				<span>
					<strong class="text-stone-900">{profile.completedAsCustomer}</strong>
					{profile.completedAsCustomer === 1 ? 'Auftrag' : 'Aufträge'} als Auftraggeber
				</span>
			</div>
		</div>
		{#if data.isOwn}
			<a href="/profil" class="text-sm font-medium text-emerald-700 hover:underline">
				Profil bearbeiten
			</a>
		{/if}
	</section>

	<section>
		<h2 class="mb-2 text-lg font-semibold">Über mich</h2>
		{#if profile.bio}
			<p class="whitespace-pre-line text-stone-700">{profile.bio}</p>
		{:else}
			<p class="text-stone-500">Noch keine Beschreibung.</p>
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
			<p class="text-stone-500">Keine offenen Anfragen.</p>
		{/if}
	</section>
</div>
