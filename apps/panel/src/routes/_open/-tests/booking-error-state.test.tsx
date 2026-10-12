import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRouteWithContext,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route as OpenRouteImport } from '../../_open';
import { Route as BookingRouteImport } from '../reservar.$slug';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
    refreshCsrfCookie: vi.fn(),
}));

// The real `_open` layout and booking route, assembled the way `routeTree.gen.ts` does, for an anonymous patient.
function renderBooking(path: string) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
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
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const router = createRouter({
        routeTree: rootRoute.addChildren([
            openRoute.addChildren([bookingRoute]),
        ]),
        context: { queryClient },
        history: createMemoryHistory({ initialEntries: [path] }),
    });

    render(<RouterProvider router={router} />);
}

function apiError(status: number, data: unknown) {
    return { isAxiosError: true, response: { status, data } };
}

describe('the public booking page when its read fails', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('tells the patient a link that does not exist, without the panel controls or a pointless retry', async () => {
        vi.mocked(api.get).mockRejectedValue(
            apiError(404, {
                error: {
                    code: 'booking.link_not_found',
                    message: 'No booking link matches this slug.',
                    context: {},
                },
            }),
        );
        renderBooking('/reservar/testarosa');

        expect(
            await screen.findByText(
                'Este link de reservas no existe. Revisá que esté bien escrito o pedile el link correcto al consultorio.',
            ),
        ).not.toBeNull();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('offers only a retry for a failure retrying can fix', async () => {
        vi.mocked(api.get).mockRejectedValue(apiError(500, {}));
        renderBooking('/reservar/consultorio-salud');

        expect(
            await screen.findByRole('button', { name: 'Reintentar' }),
        ).not.toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Ir al inicio' }),
        ).toBeNull();
        expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
    });
});
