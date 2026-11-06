import { describe, it, expect } from 'vitest';
import { looksLikeContactInfo } from './contact';

describe('looksLikeContactInfo', () => {
	it('detects contact details', () => {
		expect(looksLikeContactInfo('Schreib mir an max@example.de')).toBe(true);
		expect(looksLikeContactInfo('max at example dot de')).toBe(true);
		expect(looksLikeContactInfo('Ruf an: 0171 1234567')).toBe(true);
		expect(looksLikeContactInfo('+49 (89) 123-4567')).toBe(true);
		expect(looksLikeContactInfo('Komm vorbei, Hauptstraße 12')).toBe(true);
		expect(looksLikeContactInfo('Lindenweg 3a')).toBe(true);
		expect(looksLikeContactInfo('Lass uns auf WhatsApp schreiben')).toBe(true);
	});

	it('ignores normal repair talk', () => {
		expect(looksLikeContactInfo('Das Display kostet 89,90 € und dauert 3 Tage.')).toBe(false);
		expect(looksLikeContactInfo('Ich bin in 80331 München, passt Dienstag 14 Uhr?')).toBe(false);
		expect(looksLikeContactInfo('Modell A2482, Baujahr 2021')).toBe(false);
		expect(looksLikeContactInfo('Bring es einfach vorbei, ich schreibe dir hier die Zeit.')).toBe(
			false
		);
	});
});
