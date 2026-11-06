<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { enhance } from '$app/forms';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>RepairHub – Reparieren statt wegwerfen</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-stone-50 text-stone-900">
	<header class="border-b border-stone-200 bg-white">
		<nav class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
			<a href="/" class="text-xl font-bold text-emerald-700">RepairHub</a>
			<a href="/anfragen" class="text-sm hover:text-emerald-700">Anfragen</a>
			<div class="ml-auto flex items-center gap-3 text-sm">
				<a
					href="/anfragen/neu"
					class="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
				>
					Anfrage erstellen
				</a>
				{#if data.user}
					<span class="hidden text-stone-600 sm:inline">Hallo, {data.user.name}</span>
					<form method="post" action="/abmelden" use:enhance>
						<button class="hover:text-emerald-700">Abmelden</button>
					</form>
				{:else}
					<a href="/anmelden" class="hover:text-emerald-700">Anmelden</a>
				{/if}
			</div>
		</nav>
	</header>

	<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
		{@render children()}
	</main>

	<footer class="border-t border-stone-200 bg-white">
		<div class="mx-auto flex max-w-5xl gap-4 px-4 py-4 text-sm text-stone-500">
			<span>© RepairHub – Schulprojekt</span>
			<a href="/impressum" class="hover:text-stone-800">Impressum</a>
			<a href="/datenschutz" class="hover:text-stone-800">Datenschutz</a>
		</div>
	</footer>
</div>
