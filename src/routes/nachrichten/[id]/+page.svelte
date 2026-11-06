<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { tick } from 'svelte';
	import { contactInfoWarning, looksLikeContactInfo } from '#lib/contact.ts';
	import type { PageProps } from './$types';

	const POLL_INTERVAL_MS = 5000;

	let { data, form }: PageProps = $props();
	const conversation = $derived(data.conversation);

	type Message = (typeof data.messages)[number];

	// Starts from the server data and grows with polled messages until the next load.
	let messages = $derived(data.messages);
	let body = $state('');
	let sending = $state(false);
	let list = $state<HTMLElement>();
	let formElement = $state<HTMLFormElement>();

	const showContactWarning = $derived(!conversation.bookedOrderId && looksLikeContactInfo(body));

	async function poll() {
		if (document.visibilityState !== 'visible') return;
		const last = messages.at(-1);
		const query = last ? `?after=${encodeURIComponent(last.createdAt.toISOString())}` : '';
		const response = await fetch(`/api/conversations/${conversation.id}/messages${query}`);
		if (!response.ok) return;

		const { messages: incoming } = (await response.json()) as {
			messages: (Omit<Message, 'createdAt'> & { createdAt: string })[];
		};
		const known = new Set(messages.map((m) => m.id));
		const fresh = incoming
			.filter((m) => !known.has(m.id))
			.map((m) => ({ ...m, createdAt: new Date(m.createdAt) }));
		if (fresh.length) messages = [...messages, ...fresh];
	}

	$effect(() => {
		// Opening a chat marks it as read on the server; refresh the header badge.
		void conversation.id;
		invalidate('app:unread');
		const timer = setInterval(poll, POLL_INTERVAL_MS);
		return () => clearInterval(timer);
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

<a href="/nachrichten" class="text-sm text-emerald-700 hover:underline">← Alle Nachrichten</a>

<div class="mt-4 flex h-[70vh] flex-col rounded-lg border border-stone-200 bg-white">
	<header class="border-b border-stone-100 p-4">
		<div class="font-semibold">{conversation.otherPartyName}</div>
		<div class="text-sm text-stone-500">
			<a href="/anfragen/{conversation.requestId}" class="hover:underline">
				{conversation.requestTitle}
			</a>
			{#if conversation.bookedOrderId}
				·
				<a href="/auftraege/{conversation.bookedOrderId}" class="text-emerald-700 hover:underline">
					Zum Auftrag
				</a>
			{/if}
		</div>
	</header>

	<div bind:this={list} class="flex-1 space-y-2 overflow-y-auto p-4">
		{#each messages as m, i (m.id)}
			{@const mine = m.senderId === data.userId}
			{#if i === 0 || !sameDay(messages[i - 1].createdAt, m.createdAt)}
				<div class="py-2 text-center text-xs text-stone-400">
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
						? 'bg-emerald-600 text-white'
						: 'bg-stone-100 text-stone-900'}"
				>
					<p class="text-sm break-words whitespace-pre-line">{m.body}</p>
					<p class="mt-0.5 text-right text-[10px] {mine ? 'text-emerald-100' : 'text-stone-400'}">
						{time(m.createdAt)}
					</p>
				</div>
			</div>
		{:else}
			<p class="py-8 text-center text-sm text-stone-400">
				Noch keine Nachrichten. Schreib die erste!
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
		class="border-t border-stone-100 p-3"
	>
		{#if showContactWarning}
			<p class="mb-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">{contactInfoWarning}</p>
		{/if}
		{#if form?.message}
			<p class="mb-2 text-sm text-red-600">{form.message}</p>
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
				class="min-w-0 flex-1 resize-none rounded-md border-stone-300 text-sm"></textarea>
			<button
				disabled={sending || !body.trim()}
				class="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
			>
				Senden
			</button>
		</div>
	</form>
</div>
