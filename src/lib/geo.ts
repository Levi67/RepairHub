/** Radius choices for the distance search, in km. */
export const RADIUS_OPTIONS = [10, 25, 50, 100, 200] as const;

/** "3 km", "12 km", "< 1 km" – distances are between PLZ centres, so whole km are enough. */
export function formatDistance(km: number): string {
	if (km < 1) return '< 1 km';
	return `${Math.round(km).toLocaleString('de-DE')} km`;
}
