import { describe, expect, it } from 'vitest';
import {
    centsToPesosInput,
    formatPesos,
    parseDurationInput,
    pesosInputToCents,
} from '../-components/service-price';

describe('service price conversion', () => {
    it.each([
        [1500000, '15000'],
        [5050, '50,50'],
        [1999, '19,99'],
        [0, '0'],
        [null, ''],
    ])('shows %s cents as "%s" pesos', (cents, pesos) => {
        expect(centsToPesosInput(cents)).toBe(pesos);
    });

    it.each([
        ['15000', 1500000],
        ['15.000', 1500000],
        ['1.500.000', 150000000],
        ['15.000,50', 1500050],
        ['15000,5', 1500050],
        ['15000,50', 1500050],
        ['0,99', 99],
        ['50.5', 5050],
        ['19.99', 1999],
        [' 7500 ', 750000],
        ['0', 0],
        ['', null],
        ['  ', null],
    ])('saves "%s" pesos as %s cents', (pesos, cents) => {
        expect(pesosInputToCents(pesos)).toBe(cents);
    });

    it.each([
        '-1',
        'abc',
        '15,000.50',
        '1.50.000',
        '15.0000',
        '15,555',
        '15.000.5',
        '1,2,3',
        '$ 15000',
        // Past 2^53 cents: a number no longer exact to the cent.
        '90071992547410',
        '1.000.000.000.000.000',
    ])('rejects "%s" as a price', (pesos) => {
        expect(pesosInputToCents(pesos)).toBeUndefined();
    });

    it.each([
        // $ 25.000.000, past what a 32-bit integer holds in cents.
        ['25.000.000', 2_500_000_000],
        ['90071992547409,91', Number.MAX_SAFE_INTEGER],
        // A float times 100 would land a cent off at these magnitudes.
        ['80.000.000.000.000,01', 8_000_000_000_000_001],
        ['90071992547400,01', 9_007_199_254_740_001],
    ])('takes "%s", a large price, exactly', (pesos, cents) => {
        expect(pesosInputToCents(pesos)).toBe(cents);
    });

    it.each([
        [8_000_000_000_000_001, '80000000000000,01', '$ 80.000.000.000.000,01'],
        [
            Number.MAX_SAFE_INTEGER,
            '90071992547409,91',
            '$ 90.071.992.547.409,91',
        ],
    ])('shows %i cents exactly to the cent', (cents, input, shown) => {
        expect(centsToPesosInput(cents)).toBe(input);
        expect(pesosInputToCents(centsToPesosInput(cents))).toBe(cents);
        expect(formatPesos(cents).replace(/\s/g, ' ')).toBe(shown);
    });

    it.each([0, 99, 5050, 1999, 1500000, 1500050])(
        'round-trips %s cents through the input',
        (cents) => {
            expect(pesosInputToCents(centsToPesosInput(cents))).toBe(cents);
        },
    );

    it('formats cents as ARS', () => {
        expect(formatPesos(1500000)).toBe('$ 15.000,00');
    });
});

describe('parseDurationInput', () => {
    it.each([
        ['30', 30],
        ['1', 1],
        ['', undefined],
        ['0', undefined],
        ['1.5', undefined],
        ['-5', undefined],
    ])('parses "%s" as %s', (value, minutes) => {
        expect(parseDurationInput(value)).toBe(minutes);
    });
});
