<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { tick } from 'svelte';
	import { contactInfoWarning, looksLikeContactInfo } from '#lib/contact.ts';
	import Avatar from '#lib/components/Avatar.svelte';
	import type { PageProps } from './$types';

	const POLL_INTERVAL_MS = 5000;

	let { data, form }: PageProps = $props();
	const conversation = $derived(data.conversation);

	type Message = (typeof data.messages)[number];

	// Messages fetched by polling since the last page load. Kept apart from `data.messages`,
	// because other reloads (e.g. the header badge) hand us a new `data` and must not drop them.
	let polled = $state<Message[]>([]);
	const messages = $derived.by(() => {
		const known = new Set(data.messages.map((m) => m.id));
		return [...data.messages, ...polled.filter((m) => !known.has(m.id))];
	});

	let body = $state('');
	let sending = $state(false);
	let list = $state<HTMLElement>();
	let formElement = $state<HTMLFormElement>();

	const showContactWarning = $derived(!conversation.bookedOrderId && looksLikeContactInfo(body));

	let polling = false;
	async function poll() {
		if (polling || document.visibilityState !== 'visible') return;
		polling = true;
		try {
			const last = messages.at(-1);
			const query = last ? `?after=${encodeURIComponent(last.createdAt.toISOString())}` : '';
			const response = await fetch(`/api/conversations/${conversation.id}/messages${query}`, {
				cache: 'no-store'
			});
			if (!response.ok) return;

			const { messages: incoming } = (await response.json()) as {
				messages: (Omit<Message, 'createdAt'> & { createdAt: string })[];
			};
			const known = new Set(messages.map((m) => m.id));
			const fresh = incoming
				.filter((m) => !known.has(m.id))
				.map((m) => ({ ...m, createdAt: new Date(m.createdAt) }));
			if (fresh.length) polled = [...polled, ...fresh];
		} catch {
			// Offline or server hiccup: try again on the next tick.
		} finally {
			polling = false;
		}
	}

	$effect(() => {
		void conversation.id;
		polled = [];
		// Opening a chat marks it as read on the server; refresh the header badge.
		invalidate('app:unread');

		const timer = setInterval(poll, POLL_INTERVAL_MS);
		// Hidden tabs don't poll, so catch up right away when the chat is looked at again.
		const catchUp = () => poll();
		document.addEventListener('visibilitychange', catchUp);
		window.addEventListener('focus', catchUp);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', catchUp);
			window.removeEventListener('focus', catchUp);
		};
	});

	// Keep the newest message in view.
	$effect(() => {
		void messages.length;
		tick().then(() => list?.scrollTo({ top: list.scrollHeight }));
	});

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
			event.preventDefault();
			formElement?.requestSubmit();
		}
	}

	const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
	const time = (d: Date) => d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
</script>

<svelte:head><title>Chat mit {conversation.otherPartyName} – RepairHub</title></svelte:head>

<a href="/nachrichten" class="text-sm text-emerald-400 hover:underline">← Alle Nachrichten</a>

<div class="mt-4 flex h-[70vh] flex-col rounded-xl bg-surface">
	<header class="flex items-center gap-3 border-b border-edge p-4">
		<Avatar name={conversation.otherPartyName} image={conversation.otherPartyImage} />
		<div class="min-w-0">
			<a href="/nutzer/{conversation.otherPartyId}" class="font-semibold hover:underline">
				{conversation.otherPartyName}
			</a>
			<div class="text-sm text-neutral-400">
				<a href="/anfragen/{conversation.requestId}" class="hover:underline">
					{conversation.requestTitle}
				</a>
				{#if conversation.bookedOrderId}
					·
					<a
						href="/auftraege/{conversation.bookedOrderId}"
						class="text-emerald-400 hover:underline"
					>
						Zum Auftrag
					</a>
				{/if}
			</div>
		</div>
	</header>

	<div bind:this={list} class="flex-1 space-y-2 overflow-y-auto p-4">
		{#each messages as m, i (m.id)}
			{@const mine = m.senderId === data.userId}
			{#if i === 0 || !sameDay(messages[i - 1].createdAt, m.createdAt)}
				<div class="py-2 text-center text-xs text-neutral-500">
					{m.createdAt.toLocaleDateString('de-DE', {
						weekday: 'short',
						day: 'numeric',
						month: 'long'
					})}
				</div>
			{/if}
			<div class="flex {mine ? 'justify-end' : 'justify-start'}">
				<div
					class="max-w-[80%] rounded-lg px-3 py-2 {mine
						? 'bg-emerald-400 text-neutral-950'
						: 'bg-raised text-neutral-100'}"
				>
					<p class="text-sm break-words whitespace-pre-line">{m.body}</p>
					<p class="mt-0.5 text-right text-xs {mine ? 'text-neutral-950/60' : 'text-neutral-500'}">
						{time(m.createdAt)}
					</p>
				</div>
			</div>
		{:else}
			<p class="py-8 text-center text-sm text-neutral-500">
				Noch keine Nachrichten. Schreib die erste.
			</p>
		{/each}
	</div>

	<form
		bind:this={formElement}
		method="post"
		use:enhance={() => {
			sending = true;
			return async ({ result, update }) => {
				sending = false;
				if (result.type === 'success') body = '';
				await update({ reset: false });
			};
		}}
		class="border-t border-edge p-3"
	>
		{#if showContactWarning}
			<p class="mb-2 rounded-md bg-amber-400/10 p-2 text-xs text-amber-300">{contactInfoWarning}</p>
		{/if}
		{#if form?.message}
			<p class="mb-2 text-sm text-red-400">{form.message}</p>
		{/if}
		<div class="flex items-end gap-2">
			<textarea
				name="body"
				rows="2"
				required
				maxlength={data.maxLength}
				placeholder="Nachricht schreiben … (Enter senden, Shift+Enter neue Zeile)"
				bind:value={body}
				onkeydown={onKeydown}
				class="min-w-0 flex-1 resize-none rounded-md border-edge text-sm"></textarea>
			<button
				disabled={sending || !body.trim()}
				class="rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-300 disabled:opacity-50"
			>
				Senden
			</button>
		</div>
	</form>
</div>
