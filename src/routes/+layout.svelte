<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import Avatar from '#lib/components/Avatar.svelte';
	import Wrench from 'phosphor-svelte/lib/Wrench';
	import Plus from 'phosphor-svelte/lib/Plus';
	import List from 'phosphor-svelte/lib/List';
	import X from 'phosphor-svelte/lib/X';
	import SignOut from 'phosphor-svelte/lib/SignOut';
	import Crown from 'phosphor-svelte/lib/Crown';
	import Warning from 'phosphor-svelte/lib/Warning';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const UNREAD_POLL_INTERVAL_MS = 30_000;
	const loggedIn = $derived(Boolean(data.user));

	let menuOpen = $state(false);

	const links = $derived([
		{ href: '/anfragen', label: 'Anfragen' },
		...(data.user
			? [
					{ href: '/profil/meine-anfragen', label: 'Meine Anfragen' },
					{ href: '/profil/meine-angebote', label: 'Meine Angebote' },
					{ href: '/auftraege', label: 'Aufträge' },
					{ href: '/nachrichten', label: 'Nachrichten', badge: data.unreadMessages }
				]
			: [])
	]);

	/** A link is current on its own page and on pages below it, except /anfragen/neu (own CTA). */
	function isCurrent(href: string) {
		const path = page.url.pathname;
		if (path === '/anfragen/neu') return false;
		return path === href || path.startsWith(href + '/');
	}

	// Close the mobile menu after navigating.
	$effect(() => {
		void page.url.pathname;
		menuOpen = false;
	});

	$effect(() => {
		if (!loggedIn) return;
		const timer = setInterval(() => {
			if (document.visibilityState === 'visible') invalidate('app:unread');
		}, UNREAD_POLL_INTERVAL_MS);
		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>RepairHub – Reparieren statt wegwerfen</title>
	<meta
		name="description"
		content="RepairHub verbindet dich mit Reparateuren in deiner Nähe. Beschreibe, was kaputt ist, und erhalte Angebote per Versand, vor Ort oder bei dir zu Hause."
	/>
	<meta property="og:title" content="RepairHub – Reparieren statt wegwerfen" />
	<meta
		property="og:description"
		content="Reparateure in deiner Nähe schicken dir Angebote für dein kaputtes Gerät."
	/>
	<meta property="og:type" content="website" />
</svelte:head>

{#snippet unread(count: number | undefined)}
	{#if count}
		<span
			class="rounded-md bg-emerald-400 px-1.5 text-xs font-semibold text-neutral-950 tabular-nums"
			aria-label="{count} ungelesen"
		>
			{count}
		</span>
	{/if}
{/snippet}

<a
	href="#inhalt"
	class="sr-only z-50 rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-neutral-950 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
>
	Zum Inhalt springen
</a>

<div class="relative z-10 flex min-h-dvh flex-col">
	<header class="sticky top-0 z-40 px-4 pt-3">
		{#if data.impersonation}
			<!-- Can't be closed: as long as the super admin acts as someone else, every page says so. -->
			<div
				role="alert"
				class="-mx-4 -mt-3 mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-2 text-sm font-semibold {data
					.impersonation.isTest
					? 'bg-amber-400 text-neutral-950'
					: 'bg-red-600 text-white'}"
			>
				<span class="flex items-center gap-2">
					<Warning size={18} weight="fill" />
					{data.impersonation.isTest ? 'Testkonto:' : 'Achtung, echtes Konto:'} Du bist als
					{data.user?.name} angemeldet. Alles, was du tust, passiert in diesem Konto.
				</span>
				<form method="post" action="/zurueckwechseln">
					<button
						class="rounded-md px-3 py-1 font-semibold {data.impersonation.isTest
							? 'bg-neutral-950 text-amber-300 hover:bg-neutral-800'
							: 'bg-white text-red-700 hover:bg-red-100'}"
					>
						Zurück zu {data.impersonation.by}
					</button>
				</form>
			</div>
		{/if}
		<nav
			class="mx-auto flex max-w-6xl items-center gap-6 rounded-xl border border-edge bg-surface/80 py-2 pr-2 pl-4 shadow-lg shadow-black/30 backdrop-blur-md"
			aria-label="Hauptnavigation"
		>
			<a href="/" class="flex items-center gap-2 text-lg font-semibold tracking-tight">
				<Wrench size={20} weight="bold" class="text-emerald-400" />
				RepairHub
			</a>

			<ul class="hidden items-center gap-1 lg:flex">
				{#each links as link (link.href)}
					<li>
						<a
							href={link.href}
							aria-current={isCurrent(link.href) ? 'page' : undefined}
							class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium {isCurrent(
								link.href
							)
								? 'bg-raised text-neutral-100'
								: 'text-neutral-400 hover:text-neutral-100'}"
						>
							{link.label}
							{@render unread(link.badge)}
						</a>
					</li>
				{/each}
			</ul>

			<div class="ml-auto flex items-center gap-2">
				{#if data.user?.isAdmin}
					<a
						href="/admin"
						class="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-medium sm:flex {isCurrent(
							'/admin'
						)
							? 'bg-raised text-neutral-100'
							: 'text-neutral-400 hover:text-neutral-100'}"
					>
						<Crown size={16} weight="bold" class="text-emerald-400" />
						Admin
					</a>
				{/if}
				<a
					href="/anfragen/neu"
					class="hidden items-center gap-2 rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-300 active:scale-[0.98] sm:flex"
				>
					<Plus size={16} weight="bold" />
					Anfrage erstellen
				</a>
				{#if data.user}
					<a
						href="/profil"
						class="flex items-center gap-2 rounded-md p-1 text-sm text-neutral-300 hover:bg-raised hover:text-neutral-100 sm:pr-3"
						title="Mein Profil"
					>
						<Avatar name={data.user.name} image={data.user.image} size="sm" />
						<span class="hidden xl:inline">{data.user.name}</span>
					</a>
					<form method="post" action="/abmelden" use:enhance class="hidden lg:block">
						<button
							class="flex items-center rounded-md p-2 text-neutral-400 hover:bg-raised hover:text-neutral-100"
							title="Abmelden"
							aria-label="Abmelden"
						>
							<SignOut size={18} weight="bold" />
						</button>
					</form>
				{:else}
					<a
						href="/anmelden"
						class="hidden rounded-md px-3 py-2 text-sm font-semibold text-neutral-300 hover:text-neutral-100 sm:block"
					>
						Anmelden
					</a>
				{/if}
				<button
					class="relative flex size-9 items-center justify-center rounded-md text-neutral-300 hover:bg-raised lg:hidden"
					aria-expanded={menuOpen}
					aria-controls="mobile-menu"
					aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
					onclick={() => (menuOpen = !menuOpen)}
				>
					<span
						class="absolute transition duration-300 ease-base {menuOpen
							? 'scale-50 rotate-90 opacity-0'
							: 'opacity-100'}"
					>
						<List size={20} weight="bold" />
					</span>
					<span
						class="absolute transition duration-300 ease-base {menuOpen
							? 'opacity-100'
							: 'scale-50 -rotate-90 opacity-0'}"
					>
						<X size={20} weight="bold" />
					</span>
				</button>
			</div>
		</nav>

		<!-- Full-height mobile panel; links arrive one after another. -->
		<div
			id="mobile-menu"
			class="fixed inset-x-0 top-0 bottom-0 -z-10 bg-canvas/95 px-4 pt-24 backdrop-blur-md transition duration-300 ease-base lg:hidden {menuOpen
				? 'visible opacity-100'
				: 'invisible opacity-0'}"
		>
			<ul class="mx-auto flex max-w-6xl flex-col gap-1">
				{#each [...links, ...(data.user?.isAdmin ? [{ href: '/admin', label: 'Admin' }] : []), ...(!data.user ? [{ href: '/anmelden', label: 'Anmelden' }] : []), { href: '/anfragen/neu', label: 'Anfrage erstellen' }] as link, i (link.href)}
					<li
						class="transition duration-500 ease-base {menuOpen
							? 'translate-y-0 opacity-100'
							: 'translate-y-2 opacity-0'}"
						style:transition-delay={menuOpen ? `${i * 50}ms` : '0ms'}
					>
						<a
							href={link.href}
							aria-current={isCurrent(link.href) ? 'page' : undefined}
							class="flex items-center gap-3 rounded-lg px-4 py-3 text-2xl font-semibold tracking-tight {isCurrent(
								link.href
							)
								? 'bg-surface text-neutral-100'
								: 'text-neutral-400 hover:text-neutral-100'}"
						>
							{link.label}
							{#if 'badge' in link}{@render unread(link.badge)}{/if}
						</a>
					</li>
				{/each}
				{#if data.user}
					<li class="mt-4 border-t border-edge pt-4">
						<form method="post" action="/abmelden" use:enhance>
							<button
								class="flex items-center gap-3 rounded-lg px-4 py-3 text-base font-semibold text-neutral-400 hover:text-neutral-100"
							>
								<SignOut size={18} weight="bold" />
								Abmelden
							</button>
						</form>
					</li>
				{/if}
			</ul>
		</div>
	</header>

	<main id="inhalt" class="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-24">
		{@render children()}
	</main>

	<footer class="border-t border-edge">
		<div
			class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-8 pb-12 text-sm text-neutral-500"
		>
			<span class="flex items-center gap-2 font-medium text-neutral-300">
				<Wrench size={16} weight="bold" class="text-emerald-400" />
				RepairHub
			</span>
			<span>Schulprojekt</span>
			<a href="/impressum" class="ml-auto hover:text-neutral-100">Impressum</a>
			<a href="/datenschutz" class="hover:text-neutral-100">Datenschutz</a>
		</div>
	</footer>
</div>
