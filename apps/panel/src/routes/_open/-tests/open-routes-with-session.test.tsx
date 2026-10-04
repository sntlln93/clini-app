import { api } from '@/lib/api';
import { sessionQueryOptions } from '@/lib/session';
import type { BookingOrganizationResponse } from '@/types/booking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRouteWithContext,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route as OpenRouteImport } from '../../_open';
import { Route as InvitationRouteImport } from '../invitaciones.$token';
import { Route as BookingRouteImport } from '../reservar.$slug';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
    refreshCsrfCookie: vi.fn(),
}));

const ORGANIZATION: BookingOrganizationResponse = {
    organization: {
        name: 'Consultorio Salud',
        slug: 'consultorio-salud',
        timezone: 'UTC',
    },
    professionals: [],
    preselected_membership_id: null,
};

// The real `_open` layout and page routes, assembled the same way `routeTree.gen.ts` does, under a root that already holds a session — the case `_public`'s guard used to bounce to `/agenda`.
function renderWithSession(path: string) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(sessionQueryOptions.queryKey, {
        id: 1,
        name: 'Beto Recepción',
        email: 'beto@clini.app',
    });

    const rootRoute = createRootRouteWithContext<{
        queryClient: QueryClient;
    }>()({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    /* eslint-disable @typescript-eslint/no-explicit-any -- mirrors routeTree.gen.ts's own `.update()` calls */
    const openRoute = OpenRouteImport.update({
        id: '/_open',
        getParentRoute: () => rootRoute,
    } as any);
    const bookingRoute = BookingRouteImport.update({
        id: '/reservar/$slug',
        path: '/reservar/$slug',
        getParentRoute: () => openRoute,
    } as any);
    const invitationRoute = InvitationRouteImport.update({
        id: '/invitaciones/$token',
        path: '/invitaciones/$token',
        getParentRoute: () => openRoute,
    } as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const agendaRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/agenda',
        component: () => <div>Agenda</div>,
    });
    const routeTree = rootRoute.addChildren([
        openRoute.addChildren([bookingRoute, invitationRoute]),
        agendaRoute,
    ]);
    const router = createRouter({
        routeTree,
        context: { queryClient },
        history: createMemoryHistory({ initialEntries: [path] }),
    });

    render(<RouterProvider router={router} />);

    return router;
}

describe('_open routes with a session', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('opens the booking wizard instead of redirecting to /agenda', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: ORGANIZATION });
        const router = renderWithSession('/reservar/consultorio-salud');

        expect(
            await screen.findByRole('heading', { name: 'Reservar turno' }),
        ).not.toBeNull();
        expect(screen.queryByText('Agenda')).toBeNull();
        expect(router.state.location.pathname).toBe(
            '/reservar/consultorio-salud',
        );
    });

    it('opens the invitation and warns that accepting switches accounts', async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: {
                email: 'ana@clini.app',
                organization_name: 'Consultorio Ana',
                requires_registration: false,
            },
        });
        renderWithSession('/invitaciones/abc123');

        expect(
            await screen.findByRole('button', { name: 'Aceptar invitación' }),
        ).not.toBeNull();
        expect(
            screen.getByText(
                'Tenés una sesión abierta como beto@clini.app; al aceptar vas a ingresar como ana@clini.app.',
            ),
        ).not.toBeNull();
    });
});
