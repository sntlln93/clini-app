import { describe, expect, it } from 'vitest';
import { emptyEntry, toEntryPayload } from './medical-history-schema';

describe('toEntryPayload', () => {
    it('sends an allergy with its reaction and severity, never a date', () => {
        expect(
            toEntryPayload({
                ...emptyEntry('allergy'),
                description: ' Penicilina ',
                reaction: 'Urticaria',
                severity: 'severe',
                approximate_date: '2015',
            }),
        ).toEqual({
            category: 'allergy',
            description: 'Penicilina',
            reaction: 'Urticaria',
            severity: 'severe',
            approximate_date: null,
            reason: null,
        });
    });

    it('sends an antecedent with its date, never a reaction or a severity', () => {
        expect(
            toEntryPayload({
                ...emptyEntry('surgical'),
                description: 'Apendicectomía',
                reaction: 'No aplica',
                severity: 'mild',
                approximate_date: '2015',
                reason: 'Faltaba la fecha.',
            }),
        ).toEqual({
            category: 'surgical',
            description: 'Apendicectomía',
            reaction: null,
            severity: null,
            approximate_date: '2015',
            reason: 'Faltaba la fecha.',
        });
    });
});
