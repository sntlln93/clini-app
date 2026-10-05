import { describe, expect, it } from 'vitest';
import { annualSavings, annualTotal, formatArs, monthlyPrice } from './pricing';

describe('pricing', () => {
    it('keeps the monthly price as is', () => {
        expect(monthlyPrice(15_000, 'monthly')).toBe(15_000);
    });

    it('applies the 40% annual discount', () => {
        expect(monthlyPrice(15_000, 'annual')).toBe(9_000);
        expect(annualTotal(15_000)).toBe(108_000);
        expect(annualSavings(15_000)).toBe(72_000);
    });

    it('formats pesos without decimals', () => {
        expect(formatArs(108_000)).toBe('$108.000');
    });
});
