<script module lang="ts">
	export type Photo = { path: string; url: string; locked?: boolean };
</script>

<script lang="ts">
	import { PHOTO_MAX_ORIGINAL_BYTES, shrinkPhoto } from '#lib/images.ts';

	let {
		photos = $bindable([]),
		busy = $bindable(false),
		max = 8,
		name = 'photos'
	}: { photos: Photo[]; busy?: boolean; max?: number; name?: string } = $props();

	let input = $state<HTMLInputElement>();
	let problems = $state<string[]>([]);
	let uploading = $state(0);

	const free = $derived(max - photos.length);
	// Locked photos (already on a request with quotes) stay in place, so only new ones can move.
	const canReorder = $derived(!photos.some((p) => p.locked));

	async function upload() {
		if (!input) return;
		const files = [...(input.files ?? [])];
		input.value = '';
		if (!files.length) return;

		problems = [];
		if (files.length > free) {
			problems.push(
				`Nur noch ${free} ${free === 1 ? 'Foto' : 'Fotos'} möglich, der Rest wurde ignoriert.`
			);
		}

		busy = true;
		uploading = Math.min(files.length, free);
		try {
			const shrunk: Blob[] = [];
			for (const file of files.slice(0, free)) {
				if (file.size > PHOTO_MAX_ORIGINAL_BYTES) {
					problems.push(`„${file.name}“ ist größer als 10 MB.`);
					continue;
				}
				try {
					shrunk.push(await shrinkPhoto(file));
				} catch {
					problems.push(
						`„${file.name}“ kann dein Browser nicht lesen. Bitte als JPEG oder PNG speichern.`
					);
				}
			}
			if (!shrunk.length) return;

			const res = await fetch('/api/uploads/request-photos', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ types: shrunk.map((b) => b.type) })
			});
			if (!res.ok) {
				problems.push(
					(await res.json().catch(() => null))?.message ?? 'Upload gerade nicht möglich.'
				);
				return;
			}
			const { uploads } = (await res.json()) as { uploads: { path: string; uploadUrl: string }[] };

			const results = await Promise.all(
				uploads.map(async ({ path, uploadUrl }, i) => {
					const put = await fetch(uploadUrl, {
						method: 'PUT',
						headers: { 'Content-Type': shrunk[i].type },
						body: shrunk[i]
					}).catch(() => null);
					return put?.ok ? { path, url: URL.createObjectURL(shrunk[i]) } : null;
				})
			);
			const done = results.filter((r) => r !== null);
			if (done.length < results.length) {
				problems.push(`${results.length - done.length} Foto(s) konnten nicht hochgeladen werden.`);
			}
			photos = [...photos, ...done];
		} finally {
			busy = false;
			uploading = 0;
		}
	}

	function remove(index: number) {
		const removed = photos[index];
		photos = photos.filter((_, i) => i !== index);
		if (removed.url.startsWith('blob:')) URL.revokeObjectURL(removed.url);
	}

	function moveToFront(index: number) {
		photos = [photos[index], ...photos.filter((_, i) => i !== index)];
	}
</script>

<div>
	{#each photos as photo (photo.path)}
		<input type="hidden" {name} value={photo.path} />
	{/each}

	{#if photos.length}
		<ul class="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
			{#each photos as photo, i (photo.path)}
				<li class="group relative aspect-square overflow-hidden rounded-md bg-stone-100">
					<img src={photo.url} alt="Foto {i + 1}" class="size-full object-cover" />
					{#if i === 0}
						<span
							class="absolute top-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white"
						>
							Titelbild
						</span>
					{/if}
					{#if !photo.locked}
						<div class="absolute inset-x-1 bottom-1 flex justify-between gap-1">
							{#if canReorder && i > 0}
								<button
									type="button"
									onclick={() => moveToFront(i)}
									class="rounded bg-white/90 px-1.5 py-0.5 text-xs shadow hover:bg-white"
								>
									Als Titelbild
								</button>
							{:else}
								<span></span>
							{/if}
							<button
								type="button"
								onclick={() => remove(i)}
								aria-label="Foto {i + 1} entfernen"
								class="rounded bg-white/90 px-1.5 py-0.5 text-xs text-red-700 shadow hover:bg-white"
							>
								✕
							</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if free > 0}
		<label
			class="flex cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-stone-300 p-4 text-sm text-stone-600 hover:border-emerald-500 {busy
				? 'pointer-events-none opacity-60'
				: ''}"
		>
			{#if busy}
				Lade {uploading}
				{uploading === 1 ? 'Foto' : 'Fotos'} hoch …
			{:else}
				+ Fotos hinzufügen (noch {free})
			{/if}
			<input
				bind:this={input}
				type="file"
				accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
				multiple
				disabled={busy}
				onchange={upload}
				class="sr-only"
			/>
		</label>
	{/if}

	{#each problems as problem, i (i)}
		<p class="mt-1 text-sm text-red-600">{problem}</p>
	{/each}
</div>
