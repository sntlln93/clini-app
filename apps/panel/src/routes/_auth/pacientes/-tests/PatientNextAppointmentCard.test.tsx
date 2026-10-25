import { routerBehavior } from '@/lib/router-behavior';
import type { PatientAppointmentHistoryItem } from '@/types/patient';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientNextAppointmentCard } from '../-components/PatientNextAppointmentCard';

const APPOINTMENT: PatientAppointmentHistoryItem = {
    id: 9,
    membership_id: 1,
    patient_id: 50,
    service_id: 100,
    status: 'confirmed',
    origin: 'manual',
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

// The card on `/`, and an agenda stand-in holding the block the link's hash names.
function renderCardWithAgenda(appointment: PatientAppointmentHistoryItem) {
    const rootRoute = createRootRoute({ component: Outlet });
    const patientRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/',
        component: () => (
            <PatientNextAppointmentCard appointment={appointment} />
        ),
    });
    const agendaRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/agenda',
        component: () => <div id={`turno-${appointment.id}`}>Bloque</div>,
    });
    const router = createRouter({
        routeTree: rootRoute.addChildren([patientRoute, agendaRoute]),
        history: createMemoryHistory({ initialEntries: ['/'] }),
        ...routerBehavior,
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
        ).toBe('/agenda?date=2026-08-20&view=day#turno-9');
    });

    // #343: the day grid starts at 08:00, so an evening appointment sits below the fold.
    it("scrolls the agenda's day to the appointment's block", async () => {
        renderCardWithAgenda(APPOINTMENT);
        const scrollIntoView = vi.mocked(Element.prototype.scrollIntoView);
        scrollIntoView.mockClear();

        fireEvent.click(
            await screen.findByRole('link', { name: 'Ver en agenda' }),
        );

        const block = await screen.findByText('Bloque');
        expect(scrollIntoView).toHaveBeenCalledWith({
            block: 'center',
            inline: 'nearest',
        });
        expect(scrollIntoView.mock.contexts).toContain(block);
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
