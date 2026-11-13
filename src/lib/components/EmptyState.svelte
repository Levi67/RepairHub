<script lang="ts">
	import type { Component } from 'svelte';

	let {
		icon: Icon,
		title,
		text,
		action
	}: {
		icon: Component<{ size?: number; weight?: 'regular' | 'bold' | 'duotone'; class?: string }>;
		title: string;
		text?: string;
		action?: { href: string; label: string };
	} = $props();
</script>

<div class="rounded-xl bg-surface px-6 pt-12 pb-14">
	<div class="flex size-12 items-center justify-center rounded-lg bg-raised text-emerald-400">
		<Icon size={24} weight="duotone" />
	</div>
	<h3 class="mt-5 text-lg font-semibold">{title}</h3>
	{#if text}
		<p class="mt-1 max-w-md text-sm text-neutral-400">{text}</p>
	{/if}
	{#if action}
		<a
			href={action.href}
			class="mt-6 inline-flex rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-300 active:scale-[0.98]"
		>
			{action.label}
		</a>
	{/if}
</div>
