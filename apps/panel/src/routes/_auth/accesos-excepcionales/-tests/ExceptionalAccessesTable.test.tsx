import type { ExceptionalAccess } from '@/types/clinical-access';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExceptionalAccessesTable } from '../-components/ExceptionalAccessesTable';

function renderTable(accesses: ExceptionalAccess[]) {
    const rootRoute = createRootRoute({
        component: () => (
            <ExceptionalAccessesTable
                accesses={accesses}
                empty={<p>Sin accesos excepcionales</p>}
            />
        ),
    });
    const router = createRouter({
        routeTree: rootRoute,
        history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
}

describe('ExceptionalAccessesTable', () => {
    it('shows who opened which patient history, why and when', async () => {
        renderTable([
            {
                id: 1,
                created_at: '2026-10-20T13:30:00Z',
                professional: { membership_id: 4, name: 'Dra. Carla Ruiz' },
                patient: { id: 10, name: 'Lucía Fernández' },
                reason: 'study_result',
            },
        ]);

        await screen.findByText('Dra. Carla Ruiz');
        expect(screen.getByText('Resultado de estudio')).toBeTruthy();
        expect(
            screen
                .getByRole('link', { name: 'Lucía Fernández' })
                .getAttribute('href'),
        ).toBe('/pacientes/10');
    });

    it('shows the empty state when nobody opened a history out of turn', async () => {
        renderTable([]);

        await screen.findByText('Sin accesos excepcionales');
    });
});
