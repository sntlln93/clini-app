import { describe, expect, it } from 'vitest';
import { patientPrefillFromSearch } from '../-components/patient-prefill';

describe('patientPrefillFromSearch', () => {
    it('seeds the document number from digits, dropping dots and spaces', () => {
        expect(patientPrefillFromSearch(' 30.111 222 ')).toEqual({
            document_number: '30111222',
        });
    });

    it('seeds the name from anything else', () => {
        expect(patientPrefillFromSearch('  Zoe Díaz ')).toEqual({
            name: 'Zoe Díaz',
        });
    });

    it('seeds nothing without a search', () => {
        expect(patientPrefillFromSearch(null)).toEqual({});
        expect(patientPrefillFromSearch('   ')).toEqual({});
    });
});
