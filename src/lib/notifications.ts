// Email notification types a user can switch off (Technical.md 3.12). In-app notifications are always on.
export const emailNotificationTypes = [
	'newQuote',
	'quoteDecision',
	'directRequest',
	'newMessage',
	'orderStatus',
	'autoConfirmReminder',
	'payout',
	'requestExpiring'
] as const;

export type EmailNotificationType = (typeof emailNotificationTypes)[number];
export type NotificationPrefs = Record<EmailNotificationType, boolean>;

export const emailNotificationLabels: Record<EmailNotificationType, string> = {
	newQuote: 'Neues Angebot auf meine Anfrage',
	quoteDecision: 'Mein Angebot wurde angenommen oder abgelehnt',
	directRequest: 'Neue Direktanfrage an mich',
	newMessage: 'Neue Nachricht (höchstens eine E-Mail pro Chat alle 15 Minuten)',
	orderStatus: 'Status eines Auftrags hat sich geändert',
	autoConfirmReminder: 'Erinnerung vor der automatischen Bestätigung',
	payout: 'Auszahlung wurde gesendet',
	requestExpiring: 'Meine Anfrage läuft bald ab'
};

/** Stored prefs may be missing or from an older version: every type not explicitly off is on. */
export function readNotificationPrefs(stored: unknown): NotificationPrefs {
	const saved = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
	return Object.fromEntries(
		emailNotificationTypes.map((type) => [type, saved[type] !== false])
	) as NotificationPrefs;
}
