import { describe, expect, it } from 'vitest';
import { euroAmount, optionalEuroAmount } from './form';

describe('euroAmount', () => {
	const price = euroAmount('Ungültig');

	it('accepts normal amounts up to 100.000 €', () => {
		expect(price.parse('49,90')).toBe(4990);
		expect(price.parse('100.000')).toBe(10_000_000);
	});

	it('rejects amounts above the limit with a clear message', () => {
		for (const input of ['100.000,01', '25000000', '99999999999999999999']) {
			const result = price.safeParse(input);
			expect(result.success).toBe(false);
			expect(result.error?.issues[0].message).toMatch(/^Höchstens 100\.000,00/);
		}
	});

	it('rejects invalid and zero amounts', () => {
		expect(price.safeParse('abc').error?.issues[0].message).toBe('Ungültig');
		expect(price.safeParse('0').success).toBe(false);
	});
});

describe('optionalEuroAmount', () => {
	const budget = optionalEuroAmount('Ungültig');

	it('turns an empty field into null', () => {
		expect(budget.parse('')).toBeNull();
		expect(budget.parse('   ')).toBeNull();
		expect(budget.parse(undefined)).toBeNull();
	});

	it('applies the same limit', () => {
		expect(budget.parse('50')).toBe(5000);
		expect(budget.safeParse('25000000').success).toBe(false);
	});
});
