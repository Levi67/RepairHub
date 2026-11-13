import type { Actions, PageServerLoad } from './$types';
import {
	describeMaintenance,
	MAINTENANCE_ACTION,
	runMaintenance
} from '#lib/server/maintenance.ts';
import { listAdminLog, requireSuperAdmin, superAction } from '#lib/server/superadmin.ts';

export const load: PageServerLoad = async (event) => {
	requireSuperAdmin(event);
	return { entries: await listAdminLog(), maintenanceAction: MAINTENANCE_ACTION };
};

export const actions: Actions = {
	/** Runs the daily background jobs (#49) right now. */
	maintenance: (event) =>
		superAction(event, async (actor) => describeMaintenance(await runMaintenance(actor.id)))
};
