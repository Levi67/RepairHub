<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '#lib/components/Avatar.svelte';
	import PlzCityFields from '#lib/components/PlzCityFields.svelte';
	import Eye from 'phosphor-svelte/lib/Eye';
	import Wallet from 'phosphor-svelte/lib/Wallet';
	import GearSix from 'phosphor-svelte/lib/GearSix';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const AVATAR_SIZE_PX = 256;

	const profile = $derived(data.profile);
	const values = $derived(form?.values ?? profile);
	const errors = $derived<Record<string, string>>(form?.errors ?? {});

	let avatarInput: HTMLInputElement;
	let preview = $state<string | null>(null);
	let preparing = $state(false);

	/** Crops the chosen photo to a square and shrinks it to 256 px WebP before uploading. */
	async function prepareAvatar() {
		const file = avatarInput.files?.[0];
		if (!file) return;
		preparing = true;
		try {
			const bitmap = await createImageBitmap(file);
			const side = Math.min(bitmap.width, bitmap.height);
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = AVATAR_SIZE_PX;
			canvas
				.getContext('2d')!
				.drawImage(
					bitmap,
					(bitmap.width - side) / 2,
					(bitmap.height - side) / 2,
					side,
					side,
					0,
					0,
					AVATAR_SIZE_PX,
					AVATAR_SIZE_PX
				);
			const blob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, 'image/webp', 0.85)
			);
			if (!blob) return;
			const transfer = new DataTransfer();
			transfer.items.add(new File([blob], 'avatar.webp', { type: blob.type }));
			avatarInput.files = transfer.files;
			if (preview) URL.revokeObjectURL(preview);
			preview = URL.createObjectURL(blob);
		} catch {
			// Browser can't read this format (e.g. HEIC outside Safari): the server will reject it.
		} finally {
			preparing = false;
		}
	}
</script>

<svelte:head><title>Mein Profil – RepairHub</title></svelte:head>

{#snippet error(field: string)}
	{#if errors[field]}
		<p class="mt-1 text-sm text-red-400">{errors[field]}</p>
	{/if}
{/snippet}

<div class="mx-auto max-w-2xl space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-3xl font-semibold tracking-tight">Mein Profil</h1>
		<nav class="flex flex-wrap gap-2" aria-label="Profil">
			{#each [{ href: `/nutzer/${profile.id}`, label: 'Öffentliches Profil', icon: Eye }, { href: '/profil/auszahlungen', label: 'Auszahlungen', icon: Wallet }, { href: '/profil/einstellungen', label: 'Einstellungen', icon: GearSix }] as link (link.href)}
				<a
					href={link.href}
					class="flex items-center gap-2 rounded-md bg-raised px-3 py-2 text-sm font-semibold text-neutral-100 hover:bg-edge active:scale-[0.98]"
				>
					<link.icon size={16} weight="bold" class="text-neutral-400" />
					{link.label}
				</a>
			{/each}
		</nav>
	</div>

	<section class="rounded-xl bg-surface p-6">
		<h2 class="mb-4 font-semibold">Profilbild</h2>
		<div class="flex flex-wrap items-center gap-6">
			{#if preview}
				<img src={preview} alt="Vorschau" class="size-24 rounded-2xl object-cover" />
			{:else}
				<Avatar name={profile.name} image={profile.image} size="lg" />
			{/if}
			<div class="space-y-3">
				<form
					method="post"
					action="?/avatar"
					enctype="multipart/form-data"
					use:enhance={() =>
						async ({ update }) => {
							await update();
							preview = null;
						}}
					class="flex flex-wrap items-center gap-3"
				>
					<input
						bind:this={avatarInput}
						type="file"
						name="avatar"
						accept="image/jpeg,image/png,image/webp,image/heic"
						required
						onchange={prepareAvatar}
						class="text-sm"
					/>
					<button
						disabled={preparing}
						class="rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-300 disabled:opacity-50"
					>
						Bild speichern
					</button>
				</form>
				{#if profile.image}
					<form method="post" action="?/removeAvatar" use:enhance>
						<button class="text-sm text-neutral-400 hover:text-red-400">Bild entfernen</button>
					</form>
				{/if}
				{#if form && 'message' in form && form.message}
					<p class="text-sm text-red-400">{form.message}</p>
				{:else if form && 'saved' in form && form.saved === 'avatar'}
					<p class="text-sm text-emerald-400">Profilbild gespeichert.</p>
				{/if}
			</div>
		</div>
	</section>

	<form
		method="post"
		action="?/profile"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false })}
		class="space-y-5 rounded-xl bg-surface p-6"
	>
		<h2 class="font-semibold">Angaben</h2>
		<label class="block">
			<span class="text-sm font-medium">Name *</span>
			<input
				name="name"
				required
				maxlength="50"
				autocomplete="name"
				value={values.name}
				class="mt-1 w-full rounded-md border-edge"
			/>
			<span class="text-xs text-neutral-400">Wird öffentlich angezeigt, z. B. „Anna K.“</span>
			{@render error('name')}
		</label>

		<div class="grid gap-4 sm:grid-cols-[8rem_1fr]">
			<PlzCityFields
				plz={values.plz ?? ''}
				city={values.city ?? ''}
				plzError={errors.plz}
				cityError={errors.city}
			/>
		</div>
		<p class="-mt-3 text-xs text-neutral-400">
			Öffentlich, damit andere ungefähr sehen, wo du bist. Deine genaue Adresse fragen wir erst bei
			einem Auftrag ab. Neue Anfragen übernehmen PLZ und Ort automatisch.
		</p>

		<label class="block">
			<span class="text-sm font-medium">Über mich</span>
			<textarea
				name="bio"
				rows="4"
				maxlength="1000"
				placeholder="Was reparierst du gern? Was sollten andere über dich wissen?"
				class="mt-1 w-full rounded-md border-edge">{values.bio ?? ''}</textarea
			>
			{@render error('bio')}
		</label>

		<div class="flex items-center gap-4">
			<button
				class="rounded-md bg-emerald-400 px-3 py-2 font-semibold text-neutral-950 hover:bg-emerald-300"
			>
				Speichern
			</button>
			{#if form && 'saved' in form && form.saved === 'profile'}
				<span class="text-sm text-emerald-400">Gespeichert.</span>
			{/if}
		</div>
	</form>
</div>
