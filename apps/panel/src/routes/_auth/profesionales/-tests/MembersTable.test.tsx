import type { Membership } from '@/types/membership';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MembersTable } from '../-components/MembersTable';

const MEMBERSHIPS: Membership[] = [
    {
        id: 1,
        user: { id: 1, name: 'Ana Gomez', email: 'ana@clini.app' },
        roles: ['owner', 'professional'],
        status: 'active',
        deleted_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
];

function renderMembersTable(memberships: Membership[]) {
    const rootRoute = createRootRoute({ component: () => <Outlet /> });
    const profesionalesRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/profesionales',
        component: () => (
            <MembersTable
                memberships={memberships}
                empty={<p>Todavía no hay miembros.</p>}
            />
        ),
    });
    const editarRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/profesionales/$id/editar',
        component: () => <div>Editar profesional</div>,
    });
    const routeTree = rootRoute.addChildren([
        profesionalesRoute,
        editarRoute,
    ]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/profesionales'] }),
    });
    return render(<RouterProvider router={router} />);
}

describe('MembersTable', () => {
    it('renders one row per membership with name, email, roles, status and an icon-only Editar action', async () => {
        renderMembersTable(MEMBERSHIPS);

        await screen.findByText('Ana Gomez');
        screen.getByText('ana@clini.app');
        screen.getByText('Propietario');
        screen.getByText('Profesional');
        screen.getByText('Activo');

        screen.getByRole('button', { name: 'Editar' });
    });

    it('navigates to the editar page from the Editar action', async () => {
        renderMembersTable(MEMBERSHIPS);

        await screen.findByText('Ana Gomez');
        fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

        await screen.findByText('Editar profesional');
    });

    it('renders the empty state when the list is empty', async () => {
        renderMembersTable([]);

        await screen.findByText('Todavía no hay miembros.');
        expect(screen.queryByRole('table')).toBeNull();
    });

    it('renders no action for a soft-deleted membership', async () => {
        renderMembersTable([
            { ...MEMBERSHIPS[0]!, deleted_at: '2026-01-02T00:00:00Z' },
        ]);

        await screen.findByText('Ana Gomez');
        expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    });
});
