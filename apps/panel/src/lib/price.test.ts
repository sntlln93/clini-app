import { describe, expect, it } from 'vitest';
import { centsToDecimal, formatPriceCents } from './price';

describe('formatPriceCents', () => {
    it('formats cents as Argentine pesos', () => {
        expect(formatPriceCents(1500000)).toBe('$ 15.000,00');
    });

    it('formats a large amount exactly to the cent', () => {
        // `cents / 100` would print «,02»: past 2^46 pesos a float can't tell the cents.
        expect(
            formatPriceCents(8_000_000_000_000_001)?.replace(/\s/g, ' '),
        ).toBe('$ 80.000.000.000.000,01');
    });

    it('returns null when there is no price', () => {
        expect(formatPriceCents(null)).toBeNull();
    });
});

describe('centsToDecimal', () => {
    it.each([
        [0, '0.00'],
        [5, '0.05'],
        [1850050, '18500.50'],
        [-15025, '-150.25'],
        [Number.MAX_SAFE_INTEGER, '90071992547409.91'],
    ])('writes %i cents as %s', (cents, decimal) => {
        expect(centsToDecimal(cents)).toBe(decimal);
    });
});
