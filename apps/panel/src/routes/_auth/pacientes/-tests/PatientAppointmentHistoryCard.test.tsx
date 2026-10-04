import type { PatientAppointmentHistoryItem } from '@/types/patient';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PatientAppointmentHistoryCard } from '../-components/PatientAppointmentHistoryCard';

function buildAppointment(
    overrides: Partial<PatientAppointmentHistoryItem> = {},
): PatientAppointmentHistoryItem {
    return {
        id: 1,
        membership_id: 1,
        patient_id: 50,
        service_id: 100,
        status: 'completed',
        start_at: '2026-08-03T10:00:00',
        end_at: '2026-08-03T10:30:00',
        professional_name: 'Dra. Ana Gomez',
        service_name: 'Consulta general',
        organization_name: 'Consultorio Central',
        is_own_membership: true,
        ...overrides,
    };
}

function renderCard(appointments: PatientAppointmentHistoryItem[]) {
    const rootRoute = createRootRoute({
        component: () => (
            <PatientAppointmentHistoryCard appointments={appointments} />
        ),
    });
    const router = createRouter({
        routeTree: rootRoute,
        history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
}

describe('PatientAppointmentHistoryCard', () => {
    it('renders one row per appointment showing date, service, professional, organization, status and attendance', async () => {
        const appointment = buildAppointment();
        renderCard([appointment]);

        const expectedDate = new Date(appointment.start_at).toLocaleString(
            'es-AR',
            { dateStyle: 'short', timeStyle: 'short' },
        );

        expect(await screen.findByText(expectedDate)).toBeTruthy();
        expect(screen.getByText('Consulta general')).toBeTruthy();
        expect(screen.getByText('Dra. Ana Gomez')).toBeTruthy();
        expect(screen.getByText('Consultorio Central')).toBeTruthy();
        expect(screen.getByText('Completado')).toBeTruthy();
    });

    it("links each date to that day's agenda", async () => {
        const appointment = buildAppointment();
        renderCard([appointment]);

        const expectedDate = new Date(appointment.start_at).toLocaleString(
            'es-AR',
            { dateStyle: 'short', timeStyle: 'short' },
        );
        const link = await screen.findByRole('link', { name: expectedDate });
        expect(link.getAttribute('href')).toBe(
            '/agenda?date=2026-08-03&view=day',
        );
    });

    it('renders an empty state when the patient has no appointments', async () => {
        renderCard([]);

        expect(
            await screen.findByText('Este paciente todavía no tiene turnos.'),
        ).toBeTruthy();
        expect(screen.queryByRole('table')).toBeNull();
    });
});
