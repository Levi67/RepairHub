// Mirrors the `request_timeframe` pg enum in src/lib/server/db/schema.ts.
export const timeframes = ['flexible', 'within_week', 'urgent'] as const;

export type Timeframe = (typeof timeframes)[number];

export const timeframeLabels: Record<Timeframe, string> = {
	flexible: 'Flexibel',
	within_week: 'Innerhalb 1 Woche',
	urgent: 'Dringend'
};
