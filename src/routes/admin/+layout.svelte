<script lang="ts">
	import { page } from '$app/state';
	import Crown from 'phosphor-svelte/lib/Crown';
	import Gauge from 'phosphor-svelte/lib/Gauge';
	import Users from 'phosphor-svelte/lib/Users';
	import Tag from 'phosphor-svelte/lib/Tag';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		{ href: '/admin', label: 'Übersicht', icon: Gauge },
		{ href: '/admin/nutzer', label: 'Nutzer', icon: Users },
		{ href: '/admin/kategorien', label: 'Kategorien', icon: Tag }
	];
</script>

<!-- The admin area sits on its own warm-black surface so it never gets mistaken for the public app. -->
<div class="-mx-4 rounded-2xl bg-admin px-4 pt-6 pb-10 ring-1 ring-edge sm:mx-0 sm:px-8">
	<div class="mb-8 flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-edge pb-4">
		<div class="flex items-center gap-3">
			<span
				class="flex size-10 items-center justify-center rounded-lg bg-emerald-400 text-neutral-950"
			>
				<Crown size={22} weight="fill" />
			</span>
			<div>
				<div class="text-sm font-semibold">Admin</div>
				<div class="text-xs text-neutral-500">Verwaltung von RepairHub</div>
			</div>
		</div>
		<nav class="flex gap-1" aria-label="Admin">
			{#each links as link (link.href)}
				{@const current = page.url.pathname === link.href}
				<a
					href={link.href}
					aria-current={current ? 'page' : undefined}
					class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium {current
						? 'bg-raised text-neutral-100'
						: 'text-neutral-400 hover:text-neutral-100'}"
				>
					<link.icon size={16} weight={current ? 'fill' : 'bold'} />
					{link.label}
				</a>
			{/each}
		</nav>
	</div>

	{@render children()}
</div>
