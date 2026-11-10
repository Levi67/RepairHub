<script lang="ts">
	import { formatCents } from '#lib/money.ts';
	import { handoverLabels, type HandoverMode } from '#lib/handover.ts';
	import { formatDistance } from '#lib/geo.ts';

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

<a
	href="/anfragen/{request.id}"
	class="flex gap-4 rounded-lg border border-stone-200 bg-white p-4 transition hover:border-emerald-400 hover:shadow-sm"
>
	{#if request.coverUrl}
		<img
			src={request.coverUrl}
			alt=""
			loading="lazy"
			class="size-20 shrink-0 rounded-md bg-stone-100 object-cover"
		/>
	{/if}
	<div class="min-w-0 flex-1">
		<div class="mb-1 text-xs font-medium tracking-wide text-emerald-700 uppercase">
			{request.categoryName}
		</div>
		<h3 class="font-semibold">{request.title}</h3>
		<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
			<span>
				{request.plz}
				{request.city}
				{#if request.distanceKm != null}
					<span class="text-stone-400">· {formatDistance(request.distanceKm)}</span>
				{/if}
			</span>
			{#if request.budgetCents}
				<span>Budget: bis ca. {formatCents(request.budgetCents)}</span>
			{/if}
			<span>{request.handoverModes.map((m) => handoverLabels[m]).join(' · ')}</span>
		</div>
		<div class="mt-2 text-xs text-stone-400">
			{request.createdAt.toLocaleDateString('de-DE')}
		</div>
	</div>
</a>
