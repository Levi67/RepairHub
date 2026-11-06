// Rough check for contact details in chat messages before booking (Technical.md 3.9).
// It only warns and flags; false positives (e.g. tracking numbers) are acceptable.

const patterns = [
	// email, also "name at domain dot de"
	/[^\s@]+@[^\s@]+\.[a-z]{2,}/i,
	/\b\S+\s*(\(at\)|\[at\]| at )\s*\S+\s*(\.|\(dot\)|\[dot\]| dot | punkt )\s*[a-z]{2,}\b/i,
	// phone: 7+ digits, optionally with +49/0049 and separators
	/(\+|00)?\d[\d\s/\-()]{5,}\d/,
	// street + house number
	/\b[a-zäöüß-]+(straße|strasse|str\.|weg|platz|gasse|allee|ring)\s*\d+/i,
	// messenger handles
	/\b(whats\s?app|telegram|signal|insta(gram)?)\b/i
];

export function looksLikeContactInfo(text: string): boolean {
	return patterns.some((pattern) => pattern.test(text));
}

export const contactInfoWarning =
	'Bitte keine Kontaktdaten vor der Buchung teilen. So bleibt ihr über RepairHub abgesichert.';
