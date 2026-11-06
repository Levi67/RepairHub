/** Reads `?redirectTo=` and only allows same-site paths, so login can't be abused as an open redirect. */
export function safeRedirectTarget(url: URL, fallback = '/'): string {
	const target = url.searchParams.get('redirectTo');
	if (!target || !target.startsWith('/') || target.startsWith('//')) return fallback;
	return target;
}

export function loginUrl(url: URL): string {
	return `/anmelden?redirectTo=${encodeURIComponent(url.pathname + url.search)}`;
}
