<script lang="ts">
	import { enhance } from '$app/forms';
	import { emailNotificationLabels, emailNotificationTypes } from '#lib/notifications.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const errors = $derived<Record<string, string>>(form?.errors ?? {});
	const saved = $derived(form && 'saved' in form ? form.saved : null);
	const keepValues = () => (opts: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
		opts.update({ reset: false });
</script>

<svelte:head><title>Einstellungen – RepairHub</title></svelte:head>

{#snippet error(field: string)}
	{#if errors[field]}
		<p class="mt-1 text-sm text-red-600">{errors[field]}</p>
	{/if}
{/snippet}

{#snippet savedNote(name: string, text: string)}
	{#if saved === name}
		<span class="text-sm text-emerald-700">{text}</span>
	{/if}
{/snippet}

<div class="mx-auto max-w-2xl space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-2xl font-bold">Einstellungen</h1>
		<a href="/profil" class="text-sm font-medium text-emerald-700 hover:underline">
			Zurück zum Profil
		</a>
	</div>

	<form
		method="post"
		action="?/email"
		use:enhance
		class="space-y-4 rounded-lg border border-stone-200 bg-white p-6"
	>
		<h2 class="font-semibold">E-Mail ändern</h2>
		<p class="text-sm text-stone-600">Aktuell: <strong>{data.email}</strong></p>
		<label class="block">
			<span class="text-sm font-medium">Neue E-Mail</span>
			<input
				type="email"
				name="email"
				required
				autocomplete="email"
				value={form && 'email' in form ? form.email : ''}
				class="mt-1 w-full rounded-md border-stone-300"
			/>
			{#if form?.form === 'email'}{@render error('email')}{/if}
		</label>
		<label class="block">
			<span class="text-sm font-medium">Aktuelles Passwort</span>
			<input
				type="password"
				name="currentPassword"
				required
				autocomplete="current-password"
				class="mt-1 w-full rounded-md border-stone-300"
			/>
			{#if form?.form === 'email'}{@render error('currentPassword')}{/if}
		</label>
		<div class="flex items-center gap-4">
			<button
				class="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
			>
				E-Mail ändern
			</button>
			{@render savedNote('email', 'E-Mail geändert.')}
		</div>
	</form>

	<form
		method="post"
		action="?/password"
		use:enhance
		class="space-y-4 rounded-lg border border-stone-200 bg-white p-6"
	>
		<h2 class="font-semibold">Passwort ändern</h2>
		<label class="block">
			<span class="text-sm font-medium">Aktuelles Passwort</span>
			<input
				type="password"
				name="currentPassword"
				required
				autocomplete="current-password"
				class="mt-1 w-full rounded-md border-stone-300"
			/>
			{#if form?.form === 'password'}{@render error('currentPassword')}{/if}
		</label>
		<label class="block">
			<span class="text-sm font-medium">Neues Passwort</span>
			<input
				type="password"
				name="newPassword"
				required
				minlength="8"
				autocomplete="new-password"
				class="mt-1 w-full rounded-md border-stone-300"
			/>
			<span class="text-xs text-stone-500">Mindestens 8 Zeichen</span>
			{#if form?.form === 'password'}{@render error('newPassword')}{/if}
		</label>
		<label class="block">
			<span class="text-sm font-medium">Neues Passwort wiederholen</span>
			<input
				type="password"
				name="confirmPassword"
				required
				autocomplete="new-password"
				class="mt-1 w-full rounded-md border-stone-300"
			/>
			{#if form?.form === 'password'}{@render error('confirmPassword')}{/if}
		</label>
		<div class="flex items-center gap-4">
			<button
				class="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
			>
				Passwort ändern
			</button>
			{@render savedNote('password', 'Passwort geändert. Andere Geräte wurden abgemeldet.')}
		</div>
	</form>

	<form
		method="post"
		action="?/notifications"
		use:enhance={keepValues}
		class="space-y-4 rounded-lg border border-stone-200 bg-white p-6"
	>
		<div>
			<h2 class="font-semibold">E-Mail-Benachrichtigungen</h2>
			<p class="text-sm text-stone-600">
				Wofür möchtest du eine E-Mail bekommen? Im Testbetrieb werden noch keine E-Mails verschickt,
				deine Auswahl gilt, sobald das dazukommt.
			</p>
		</div>
		<div class="space-y-2">
			{#each emailNotificationTypes as type (type)}
				<label class="flex items-start gap-2 text-sm">
					<input
						type="checkbox"
						name={type}
						checked={data.notificationPrefs[type]}
						class="mt-0.5 rounded border-stone-300 text-emerald-600"
					/>
					{emailNotificationLabels[type]}
				</label>
			{/each}
		</div>
		<div class="flex items-center gap-4">
			<button
				class="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
			>
				Speichern
			</button>
			{@render savedNote('notifications', 'Gespeichert.')}
		</div>
	</form>
</div>
