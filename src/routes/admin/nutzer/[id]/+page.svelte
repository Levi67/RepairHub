<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '#lib/components/Avatar.svelte';
	import FormResult from '#lib/components/admin/FormResult.svelte';
	import OwnPassword from '#lib/components/admin/OwnPassword.svelte';
	import UserSwitch from 'phosphor-svelte/lib/UserSwitch';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const u = $derived(data.user);

	const card = 'rounded-xl bg-surface p-6';
	const input = 'mt-1 w-full rounded-md border-edge';
	const button = 'rounded-md px-3 py-2 text-sm font-semibold';
	let wipeMode = $state<'all' | 'anonymise'>('all');
</script>

<svelte:head><title>{u.name} – Admin – RepairHub</title></svelte:head>

<a href="/admin/nutzer" class="text-sm text-emerald-400 hover:underline">← Alle Nutzer</a>

<div class="mt-4 flex flex-wrap items-center gap-4">
	<Avatar name={u.name} image={u.image} size="lg" />
	<div>
		<h1 class="text-3xl font-semibold tracking-tight">{u.name}</h1>
		<p class="text-sm break-all text-neutral-400">
			{u.email}
			{#if u.isTest}· Testkonto{/if}
			{#if u.isSuperAdmin}· Super-Admin{:else if u.isAdmin}· Admin{/if}
			{#if u.bannedAt}· gesperrt{/if}
			{#if u.mustChangePassword}· muss Passwort ändern{/if}
		</p>
	</div>
	{#if !u.deletedAt}
		<a href="/nutzer/{u.id}" class="ml-auto {button} bg-raised hover:bg-edge">Öffentliches Profil</a
		>
	{/if}
</div>

<div class="mt-6"><FormResult {form} /></div>

{#if u.deletedAt}
	<p class="mt-6 {card} text-sm text-neutral-300">
		Dieses Konto wurde am {u.deletedAt.toLocaleDateString('de-DE')} anonymisiert. Aufträge und Chats mit
		anderen sind noch da und zeigen „Gelöschter Nutzer“.
	</p>
{:else}
	<div class="mt-6 grid gap-6 lg:grid-cols-2">
		<section class={card}>
			<h2 class="text-lg font-semibold">Profil</h2>
			<form method="post" action="?/save" use:enhance class="mt-4 space-y-3">
				<label class="block">
					<span class="text-sm font-medium">Name</span>
					<input name="name" value={u.name} required maxlength="50" class={input} />
				</label>
				<label class="block">
					<span class="text-sm font-medium">E-Mail</span>
					<input name="email" type="email" value={u.email} required class={input} />
				</label>
				<label class="block">
					<span class="text-sm font-medium">PLZ</span>
					<input
						name="plz"
						value={u.plz ?? ''}
						inputmode="numeric"
						maxlength="5"
						class="{input} block max-w-32"
					/>
					{#if u.city}<span class="mt-1 block text-xs text-neutral-400">{u.city}</span>{/if}
				</label>
				<label class="block">
					<span class="text-sm font-medium">Über mich</span>
					<textarea name="bio" rows="3" maxlength="1000" class={input}>{u.bio ?? ''}</textarea>
				</label>
				{#if u.image}
					<label class="flex items-center gap-2 text-sm text-neutral-300">
						<input
							type="checkbox"
							name="removeAvatar"
							class="rounded border-edge text-emerald-400"
						/>
						Profilbild entfernen
					</label>
				{/if}
				<button class="{button} bg-emerald-400 text-neutral-950 hover:bg-emerald-300">
					Speichern
				</button>
			</form>
		</section>

		<div class="space-y-6">
			{#if !data.isSelf}
				<section class={card}>
					<h2 class="text-lg font-semibold">Anmelden als {u.name}</h2>
					<p class="mt-1 text-sm text-neutral-400">
						Du siehst die App eine Stunde lang so, wie {u.name} sie sieht, und kannst in diesem Konto
						handeln. Oben steht die ganze Zeit ein Hinweis mit „Zurück“.
					</p>
					<form method="post" action="?/impersonate" use:enhance class="mt-4 space-y-3">
						{#if !u.isTest}
							<p class="rounded-md bg-red-400/10 p-3 text-sm text-red-300">
								Das ist ein echtes Konto. Dafür brauchst du dein Passwort.
							</p>
							<OwnPassword />
						{/if}
						<button class="{button} inline-flex items-center gap-2 bg-raised hover:bg-edge">
							<UserSwitch size={16} weight="bold" />
							Anmelden als {u.name}
						</button>
					</form>
				</section>

				{#if !u.isSuperAdmin}
					<section class={card}>
						<h2 class="text-lg font-semibold">Temporäres Passwort</h2>
						<p class="mt-1 text-sm text-neutral-400">
							{u.name} wird überall abgemeldet, meldet sich mit diesem Passwort an und muss danach sofort
							ein eigenes wählen. Gib es der Person selbst weiter.
						</p>
						<form method="post" action="?/password" use:enhance class="mt-4 flex flex-wrap gap-2">
							<input
								name="password"
								type="text"
								autocomplete="off"
								required
								minlength="8"
								maxlength="128"
								placeholder="mind. 8 Zeichen"
								class="min-w-0 flex-1 rounded-md border-edge"
							/>
							<button class="{button} bg-raised hover:bg-edge">Setzen</button>
						</form>
					</section>
				{/if}
			{/if}
		</div>
	</div>

	{#if !data.isSelf && !u.isSuperAdmin}
		<section class="mt-6 rounded-xl bg-surface p-6 ring-1 ring-red-400/30">
			<h2 class="text-lg font-semibold text-red-300">Nutzer löschen</h2>
			<p class="mt-1 text-sm text-neutral-400">
				Kann nicht rückgängig gemacht werden. Die E-Mail ist danach frei für ein neues Konto.
			</p>
			<form method="post" action="?/wipe" use:enhance class="mt-4 space-y-4">
				<fieldset class="space-y-2 text-sm">
					<label class="flex items-start gap-2">
						<input
							type="radio"
							name="mode"
							value="all"
							bind:group={wipeMode}
							class="mt-1 border-edge text-red-400"
						/>
						<span>
							<span class="font-semibold">Alles löschen</span>
							<span class="block text-neutral-400">
								Anfragen, Angebote, Aufträge (auch mit anderen), Chats, Bewertungen. Anfragen
								anderer, die
								{u.name} repariert hat, werden wieder geöffnet.
							</span>
						</span>
					</label>
					<label class="flex items-start gap-2">
						<input
							type="radio"
							name="mode"
							value="anonymise"
							bind:group={wipeMode}
							class="mt-1 border-edge text-red-400"
						/>
						<span>
							<span class="font-semibold">Anonymisieren</span>
							<span class="block text-neutral-400">
								Eigene Anfragen und Angebote ohne Auftrag werden gelöscht. Aufträge, Chats und
								Bewertungen mit anderen bleiben und zeigen „Gelöschter Nutzer“.
							</span>
						</span>
					</label>
				</fieldset>
				{#if data.payout?.stripeAccountId}
					<label class="flex items-center gap-2 text-sm text-neutral-300">
						<input type="checkbox" name="closeStripe" class="rounded border-edge text-red-400" />
						Auch das Stripe-Auszahlungskonto schließen
					</label>
				{/if}
				<OwnPassword />
				<button class="{button} bg-red-500 text-neutral-950 hover:bg-red-400">
					{wipeMode === 'all' ? `${u.name} komplett löschen` : `${u.name} anonymisieren`}
				</button>
			</form>
		</section>
	{/if}
{/if}
