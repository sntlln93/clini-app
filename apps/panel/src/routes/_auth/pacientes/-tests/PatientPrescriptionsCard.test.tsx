import {
    AMOXICILLIN,
    buildPrescription as buildSharedPrescription,
} from '@/tests/fixtures/prescription';
import type { Prescription } from '@/types/prescription';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PatientPrescriptionsCard } from '../-components/PatientPrescriptionsCard';

const AMOXICILLIN_DAILY = {
    ...AMOXICILLIN,
    presentation: null,
    dosage: '1 cada 8 h',
};

function buildPrescription(
    overrides: Partial<Prescription> = {},
): Prescription {
    return buildSharedPrescription({
        items: [AMOXICILLIN_DAILY],
        ...overrides,
    });
}

function renderCard(prescriptions: Prescription[]) {
    render(<PatientPrescriptionsCard prescriptions={prescriptions} />);
}

describe('PatientPrescriptionsCard', () => {
    it('shows an empty state when the professional has recorded none', async () => {
        renderCard([]);

        expect(
            await screen.findByText(
                'Todavía no registraste medicación para este paciente.',
            ),
        ).toBeTruthy();
    });

    // Nothing prints the record anymore (#319), so the card shows it in full.
    it('lists each record with every item in full and no print link', async () => {
        renderCard([
            buildPrescription({ id: 7 }),
            buildPrescription({
                id: 8,
                items: [
                    {
                        id: 2,
                        position: 0,
                        medication: 'Ibuprofeno',
                        presentation: 'Comprimidos 400 mg',
                        dosage: 'Si hay dolor',
                        quantity: 1,
                    },
                ],
            }),
        ]);

        expect(await screen.findByText('Medicación indicada')).toBeTruthy();
        expect(screen.getByText('Amoxicilina')).toBeTruthy();
        expect(screen.getByText('1 cada 8 h · Cantidad: 2')).toBeTruthy();
        expect(
            screen.getByText('Ibuprofeno — Comprimidos 400 mg'),
        ).toBeTruthy();
        expect(screen.getByText('Si hay dolor · Cantidad: 1')).toBeTruthy();
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.queryByText(/receta/i)).toBeNull();
    });

    it('an amended record shows its current items and every earlier version (#323)', async () => {
        const ibuprofen = {
            ...AMOXICILLIN_DAILY,
            id: 2,
            medication: 'Ibuprofeno',
        };
        renderCard([
            buildPrescription({
                version: 2,
                amended_at: '2026-08-04T10:00:00Z',
                items: [ibuprofen],
                versions: [
                    {
                        version: 1,
                        reason: null,
                        created_at: '2026-08-03T10:15:00Z',
                        items: [AMOXICILLIN_DAILY],
                    },
                    {
                        version: 2,
                        reason: 'Alergia.',
                        created_at: '2026-08-04T10:00:00Z',
                        items: [ibuprofen],
                    },
                ],
            }),
        ]);

        expect(await screen.findByText(/Ver las 2 versiones/)).toBeTruthy();
        expect(screen.getByText('Motivo: Alergia.')).toBeTruthy();
        expect(screen.getAllByText('Ibuprofeno')).toHaveLength(2);
        expect(screen.getByText('Amoxicilina')).toBeTruthy();
    });
});
