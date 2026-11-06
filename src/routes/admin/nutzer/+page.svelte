<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '#lib/components/Avatar.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const confirmations: Record<string, (name: string) => string> = {
		ban: (name) =>
			`${name} sperren? Die Person wird überall abgemeldet und ihre offenen Anfragen werden ausgeblendet.`,
		makeAdmin: (name) => `${name} zum Admin machen?`,
		removeAdmin: (name) => `${name} die Adminrechte entziehen?`
	};
</script>

<svelte:head><title>Nutzer – Admin – RepairHub</title></svelte:head>

<h1 class="text-2xl font-bold">Nutzer</h1>

<form method="get" class="mt-4 flex gap-2" data-sveltekit-keepfocus>
	<input
		type="search"
		name="q"
		value={data.q}
		placeholder="Name oder E-Mail"
		class="w-full max-w-sm rounded-md border-stone-300 text-sm"
	/>
	<button
		class="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
	>
		Suchen
	</button>
</form>

{#if form?.message}
	<p class="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{form.message}</p>
{/if}

<p class="mt-4 text-sm text-stone-500">
	{data.users.length === 100 ? 'Die neuesten 100 Treffer' : `${data.users.length} Nutzer`}
</p>

<ul class="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
	{#each data.users as u (u.id)}
		{@const isSelf = u.id === data.currentUserId}
		<li class="flex flex-wrap items-center gap-4 p-4 {u.bannedAt ? 'bg-red-50/50' : ''}">
			<Avatar name={u.name} image={u.image} size="sm" />
			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-center gap-2">
					<a href="/nutzer/{u.id}" class="font-medium hover:underline">{u.name}</a>
					{#if u.isAdmin}
						<span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
							Admin
						</span>
					{/if}
					{#if u.bannedAt}
						<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
							Gesperrt seit {u.bannedAt.toLocaleDateString('de-DE')}
						</span>
					{/if}
					{#if isSelf}
						<span class="text-xs text-stone-500">(du)</span>
					{/if}
				</div>
				<div class="text-sm break-all text-stone-500">{u.email}</div>
				<div class="mt-0.5 text-xs text-stone-500">
					Dabei seit {u.createdAt.toLocaleDateString('de-DE')} · {u.requests} Anfragen · {u.quotes}
					Angebote · {u.orders} Aufträge
				</div>
			</div>
			{#if !isSelf}
				<div class="flex flex-wrap gap-2">
					{#snippet action(name: string, label: string, tone: string)}
						<form
							method="post"
							action="?/{name}"
							use:enhance={({ cancel }) => {
								const ask = confirmations[name];
								if (ask && !confirm(ask(u.name))) cancel();
							}}
						>
							<input type="hidden" name="userId" value={u.id} />
							<button class="rounded-md border px-3 py-1.5 text-sm font-medium {tone}"
								>{label}</button
							>
						</form>
					{/snippet}
					{#if u.bannedAt}
						{@render action('unban', 'Entsperren', 'border-stone-300 hover:bg-stone-50')}
					{:else}
						{#if u.isAdmin}
							{@render action(
								'removeAdmin',
								'Adminrechte entziehen',
								'border-stone-300 hover:bg-stone-50'
							)}
						{:else}
							{@render action(
								'makeAdmin',
								'Zum Admin machen',
								'border-stone-300 hover:bg-stone-50'
							)}
							{@render action('ban', 'Sperren', 'border-red-300 text-red-700 hover:bg-red-50')}
						{/if}
					{/if}
				</div>
			{/if}
		</li>
	{:else}
		<li class="p-4 text-sm text-stone-500">Keine Nutzer gefunden.</li>
	{/each}
</ul>
