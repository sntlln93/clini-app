import { describe, expect, it } from 'vitest';
import { formatPriceCents } from './price';

describe('formatPriceCents', () => {
    it('formats cents as Argentine pesos', () => {
        expect(formatPriceCents(1500000)).toBe('$ 15.000,00');
    });

    it('returns null when there is no price', () => {
        expect(formatPriceCents(null)).toBeNull();
    });
});
