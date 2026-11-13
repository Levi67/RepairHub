/**
 * Svelte action: the element rises and fades in once when it scrolls into view.
 * Styling lives in layout.css under `[data-reveal]`; `delay` staggers siblings (ms).
 */
export function reveal(node: HTMLElement, delay = 0) {
	node.dataset.reveal = '';
	if (delay) node.style.transitionDelay = `${delay}ms`;

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				node.dataset.reveal = 'in';
				observer.disconnect();
			}
		},
		{ rootMargin: '0px 0px -10% 0px' }
	);
	observer.observe(node);

	return { destroy: () => observer.disconnect() };
}
