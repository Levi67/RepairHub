import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => {
	const user = event.locals.user;
	return { user: user ? { id: user.id, name: user.name } : null };
};
