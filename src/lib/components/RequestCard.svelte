<script lang="ts">
	import { formatCents } from '#lib/money.ts';
	import { handoverLabels, type HandoverMode } from '#lib/handover.ts';
	import { formatDistance } from '#lib/geo.ts';
	import MapPin from 'phosphor-svelte/lib/MapPin';
	import Wrench from 'phosphor-svelte/lib/Wrench';

	let {
		request
	}: {
		request: {
			id: string;
			title: string;
			categoryName: string;
			plz: string;
			city: string;
			budgetCents: number | null;
			handoverModes: HandoverMode[];
			createdAt: Date;
			coverUrl?: string | null;
			distanceKm?: number | null;
		};
	} = $props();
</script>

<a href="/anfragen/{request.id}" class="group flex gap-4 rounded-xl bg-surface p-3 hover:bg-raised">
	{#if request.coverUrl}
		<img
			src={request.coverUrl}
			alt="Foto zu „{request.title}“"
			loading="lazy"
			class="size-24 shrink-0 rounded-lg bg-raised object-cover"
		/>
	{:else}
		<div
			class="flex size-24 shrink-0 items-center justify-center rounded-lg bg-raised text-neutral-600 group-hover:bg-edge"
			aria-hidden="true"
		>
			<Wrench size={28} weight="duotone" />
		</div>
	{/if}
	<div class="min-w-0 flex-1 py-1">
		<div class="mb-1 text-xs font-medium text-emerald-400">
			{request.categoryName}
		</div>
		<h3 class="font-semibold">{request.title}</h3>
		<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-400">
			<span class="flex items-center gap-1">
				<MapPin size={14} weight="bold" class="text-neutral-500" />
				{request.plz}
				{request.city}
				{#if request.distanceKm != null}
					<span class="text-neutral-500">· {formatDistance(request.distanceKm)}</span>
				{/if}
			</span>
			{#if request.budgetCents}
				<span class="tabular-nums">bis ca. {formatCents(request.budgetCents)}</span>
			{/if}
		</div>
		<div class="mt-2 flex flex-wrap gap-x-3 text-xs text-neutral-500">
			<span>{request.handoverModes.map((m) => handoverLabels[m]).join(' · ')}</span>
			<span class="tabular-nums">{request.createdAt.toLocaleDateString('de-DE')}</span>
		</div>
	</div>
</a>
