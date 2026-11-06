import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import {
	createCategory,
	deleteCategory,
	listCategoriesForAdmin,
	moveCategory,
	renameCategory,
	requireAdmin
} from '#lib/server/admin.ts';
import { failOnDomainError } from '#lib/server/errors.ts';
import { categoryNameSchema } from '#lib/schemas/admin.ts';

export const load: PageServerLoad = async (event) => {
	requireAdmin(event);
	return { categories: await listCategoriesForAdmin() };
};

const idSchema = z.uuid();

export const actions: Actions = {
	rename: async (event) => {
		requireAdmin(event);
		const formData = await event.request.formData();
		const id = idSchema.safeParse(formData.get('id'));
		const name = categoryNameSchema.safeParse(formData.get('name') ?? '');
		if (!id.success) return fail(400, { message: 'Kategorie fehlt.' });
		if (!name.success) {
			return fail(400, { id: id.data, message: name.error.issues[0].message });
		}
		try {
			await renameCategory(id.data, name.data);
		} catch (error) {
			return failOnDomainError(error);
		}
	},

	move: async (event) => {
		requireAdmin(event);
		const formData = await event.request.formData();
		const id = idSchema.safeParse(formData.get('id'));
		const direction = z.enum(['up', 'down']).safeParse(formData.get('direction'));
		if (!id.success || !direction.success) return fail(400, { message: 'Ungültige Eingabe.' });
		try {
			await moveCategory(id.data, direction.data);
		} catch (error) {
			return failOnDomainError(error);
		}
	},

	create: async (event) => {
		requireAdmin(event);
		const formData = await event.request.formData();
		const parentRaw = formData.get('parentId')?.toString() || null;
		const parentId = parentRaw === null ? null : idSchema.safeParse(parentRaw).data;
		const name = categoryNameSchema.safeParse(formData.get('name') ?? '');
		if (parentId === undefined) return fail(400, { message: 'Ungültige Oberkategorie.' });
		if (!name.success) {
			return fail(400, { createIn: parentId ?? 'top', message: name.error.issues[0].message });
		}
		try {
			await createCategory(parentId, name.data);
		} catch (error) {
			return failOnDomainError(error);
		}
	},

	delete: async (event) => {
		requireAdmin(event);
		const id = idSchema.safeParse((await event.request.formData()).get('id'));
		if (!id.success) return fail(400, { message: 'Kategorie fehlt.' });
		try {
			await deleteCategory(id.data);
		} catch (error) {
			return failOnDomainError(error);
		}
	}
};
