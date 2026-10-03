import type { Prescription } from '@/types/prescription';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
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
        diagnosis: 'Faringitis',
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
        patient_name: 'Juan Pérez',
        patient_document_type: 'dni',
        patient_document_number: '30111222',
        author_name: 'Dra. Ana Gomez',
        author_specialties: [],
        ...overrides,
    };
}

function renderCard(prescriptions: Prescription[]) {
    const rootRoute = createRootRoute({
        component: () => (
            <PatientPrescriptionsCard prescriptions={prescriptions} />
        ),
    });
    const router = createRouter({
        routeTree: rootRoute,
        history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
}

describe('PatientPrescriptionsCard', () => {
    it('shows an empty state when the professional has issued none', async () => {
        renderCard([]);

        expect(
            await screen.findByText(
                'Todavía no emitiste recetas para este paciente.',
            ),
        ).toBeTruthy();
    });

    it('lists each prescription with its items and a print link', async () => {
        renderCard([
            buildPrescription({ id: 7 }),
            buildPrescription({ id: 8, diagnosis: null }),
        ]);

        expect(await screen.findByText('Faringitis')).toBeTruthy();
        expect(screen.getAllByText('Amoxicilina × 2')).toHaveLength(2);
        const links = screen.getAllByRole('link', { name: 'Imprimir' });
        expect(links.map((link) => link.getAttribute('href'))).toEqual([
            '/recetas/7',
            '/recetas/8',
        ]);
    });
});
