import type { PatientAppointmentHistoryItem } from '@/types/patient';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientNextAppointmentCard } from '../-components/PatientNextAppointmentCard';

const APPOINTMENT: PatientAppointmentHistoryItem = {
    id: 9,
    membership_id: 1,
    patient_id: 50,
    service_id: 100,
    status: 'confirmed',
    start_at: '2026-08-20T10:00:00',
    end_at: '2026-08-20T10:30:00',
    professional_name: 'Dra. Ana Gomez',
    service_name: 'Consulta general',
    organization_name: 'Consultorio Central',
    is_own_membership: false,
};

function renderCard(appointment: PatientAppointmentHistoryItem | null) {
    const rootRoute = createRootRoute({
        component: () => (
            <PatientNextAppointmentCard appointment={appointment} />
        ),
    });
    const router = createRouter({
        routeTree: rootRoute,
        history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
}

describe('PatientNextAppointmentCard', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-08-13T15:00:00'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("shows the next appointment and links to that day's agenda", async () => {
        renderCard(APPOINTMENT);

        expect(
            await screen.findByText('Consulta general · Dra. Ana Gomez'),
        ).toBeTruthy();
        expect(
            screen
                .getByRole('link', { name: 'Ver en agenda' })
                .getAttribute('href'),
        ).toBe('/agenda?date=2026-08-20&view=day');
    });

    it("says there is nothing upcoming and links to today's agenda", async () => {
        renderCard(null);

        expect(await screen.findByText('Sin turnos próximos.')).toBeTruthy();
        expect(
            screen
                .getByRole('link', { name: 'Ver en agenda' })
                .getAttribute('href'),
        ).toBe('/agenda?date=2026-08-13&view=day');
    });
});
