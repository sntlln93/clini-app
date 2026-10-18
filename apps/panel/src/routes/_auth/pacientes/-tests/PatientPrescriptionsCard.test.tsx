import type { Prescription } from '@/types/prescription';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PatientPrescriptionsCard } from '../-components/PatientPrescriptionsCard';

function buildPrescription(
    overrides: Partial<Prescription> = {},
): Prescription {
    return {
        id: 7,
        appointment_id: 42,
        patient_id: 50,
        membership_id: 1,
        issued_at: '2026-08-03T10:15:00',
        created_at: '2026-08-03T10:15:00',
        updated_at: '2026-08-03T10:15:00',
        items: [
            {
                id: 1,
                position: 0,
                medication: 'Amoxicilina',
                presentation: null,
                dosage: '1 cada 8 h',
                quantity: 2,
            },
        ],
        ...overrides,
    };
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
});
