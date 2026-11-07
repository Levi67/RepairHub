import { describe, it, expect } from 'vitest';
import { centsToInput, commissionCents, formatCents, parseEuroToCents } from './money';

describe('parseEuroToCents', () => {
	it('parses German formats', () => {
		expect(parseEuroToCents('49')).toBe(4900);
		expect(parseEuroToCents('49,9')).toBe(4990);
		expect(parseEuroToCents('1.234,50 €')).toBe(123450);
	});

	it('rejects invalid input', () => {
		expect(parseEuroToCents('')).toBeNull();
		expect(parseEuroToCents('abc')).toBeNull();
		expect(parseEuroToCents('1,234')).toBeNull();
		expect(parseEuroToCents('-5')).toBeNull();
	});
});

describe('commissionCents', () => {
	it('matches the example in Technical.md', () => {
		expect(commissionCents(8000, 1000)).toBe(800);
	});

	it('rounds to whole cents', () => {
		expect(commissionCents(1999, 1000)).toBe(200);
	});
});

describe('formatCents', () => {
	it('formats as German euro', () => {
		expect(formatCents(123450).replace(/\s/g, ' ')).toBe('1.234,50 €');
	});
});

describe('centsToInput', () => {
	it('round-trips through parseEuroToCents', () => {
		for (const cents of [100, 4990, 123456, 5]) {
			expect(parseEuroToCents(centsToInput(cents))).toBe(cents);
		}
		expect(centsToInput(null)).toBe('');
	});
});
