<script lang="ts">
	import ConfirmButton from '#lib/components/ConfirmButton.svelte';
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

<h1 class="text-3xl font-semibold tracking-tight">Nutzer</h1>

<form method="get" class="mt-4 flex gap-2" data-sveltekit-keepfocus>
	<input
		type="search"
		name="q"
		value={data.q}
		placeholder="Name oder E-Mail"
		class="w-full max-w-sm rounded-md border-edge text-sm"
	/>
	<button
		class="rounded-md bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-300"
	>
		Suchen
	</button>
</form>

{#if form?.message}
	<p class="mt-4 rounded-md bg-red-400/10 p-3 text-sm text-red-400">{form.message}</p>
{/if}

<p class="mt-4 text-sm text-neutral-400">
	{data.users.length === 100 ? 'Die neuesten 100 Treffer' : `${data.users.length} Nutzer`}
</p>

<ul class="mt-2 divide-y divide-edge rounded-xl bg-surface">
	{#each data.users as u (u.id)}
		{@const isSelf = u.id === data.currentUserId}
		<li class="flex flex-wrap items-center gap-4 p-4 {u.bannedAt ? 'bg-red-400/5' : ''}">
			<Avatar name={u.name} image={u.image} size="sm" />
			<div class="min-w-0 flex-1">
				<div class="flex flex-wrap items-center gap-2">
					<a href="/nutzer/{u.id}" class="font-medium hover:underline">{u.name}</a>
					{#if u.isAdmin}
						<span class="rounded-sm bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-300">
							Admin
						</span>
					{/if}
					{#if u.bannedAt}
						<span class="rounded-sm bg-red-400/15 px-2 py-0.5 text-xs font-medium text-red-300">
							Gesperrt seit {u.bannedAt.toLocaleDateString('de-DE')}
						</span>
					{/if}
					{#if isSelf}
						<span class="text-xs text-neutral-400">(du)</span>
					{/if}
				</div>
				<div class="text-sm break-all text-neutral-400">{u.email}</div>
				<div class="mt-0.5 text-xs text-neutral-400">
					Dabei seit {u.createdAt.toLocaleDateString('de-DE')} · {u.requests} Anfragen · {u.quotes}
					Angebote · {u.orders} Aufträge
				</div>
			</div>
			{#if !isSelf}
				<div class="flex flex-wrap gap-2">
					{#snippet action(name: string, label: string, tone: string)}
						<form method="post" action="?/{name}" use:enhance>
							<input type="hidden" name="userId" value={u.id} />
							{#if confirmations[name]}
								<ConfirmButton
									{label}
									message={confirmations[name](u.name)}
									class="inline-block rounded-md px-3 py-2 text-sm font-semibold {tone}"
								/>
							{:else}
								<button class="rounded-md px-3 py-2 text-sm font-semibold {tone}">{label}</button>
							{/if}
						</form>
					{/snippet}
					{#if u.bannedAt}
						{@render action('unban', 'Entsperren', 'bg-raised hover:bg-edge')}
					{:else}
						{#if u.isAdmin}
							{@render action('removeAdmin', 'Adminrechte entziehen', 'bg-raised hover:bg-edge')}
						{:else}
							{@render action('makeAdmin', 'Zum Admin machen', 'bg-raised hover:bg-edge')}
							{@render action('ban', 'Sperren', 'bg-red-400/10 text-red-400 hover:bg-red-400/20')}
						{/if}
					{/if}
				</div>
			{/if}
		</li>
	{:else}
		<li class="p-4 text-sm text-neutral-400">Keine Nutzer gefunden.</li>
	{/each}
</ul>
