export const handoverModes = ['shipping', 'dropoff', 'onsite'] as const;

export type HandoverMode = (typeof handoverModes)[number];

export const handoverLabels: Record<HandoverMode, string> = {
	shipping: 'Versand',
	dropoff: 'Abgabe vor Ort',
	onsite: 'Vor-Ort-Service'
};
