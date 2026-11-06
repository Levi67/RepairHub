<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		{ href: '/admin', label: 'Übersicht' },
		{ href: '/admin/nutzer', label: 'Nutzer' },
		{ href: '/admin/kategorien', label: 'Kategorien' }
	];
</script>

<div class="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-stone-200 pb-3">
	<span class="text-sm font-semibold tracking-wide text-amber-700 uppercase">Admin</span>
	{#each links as link (link.href)}
		<a
			href={link.href}
			class="text-sm hover:text-emerald-700 {page.url.pathname === link.href
				? 'font-semibold text-emerald-700'
				: 'text-stone-600'}"
		>
			{link.label}
		</a>
	{/each}
</div>

{@render children()}
