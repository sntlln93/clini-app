import { PanelLayout } from '@/layouts/PanelLayout';
import { api } from '@/lib/api';
import { sessionQueryOptions } from '@/lib/session';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SecondaryNav } from './secondary-nav';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const SETTINGS_NAV: SecondaryNav = {
    label: 'Secciones de Ajustes',
    items: [
        { label: 'Cuenta', to: '/ajustes/cuenta' },
        {
            label: 'Profesionales',
            to: '/ajustes/profesionales',
            permissions: ['memberships.view'],
        },
    ],
};

// A route tree where `/ajustes` declares a secondary navigation that its
// children inherit, and `/agenda` declares none.
function renderLayoutAt(path: string, permissions: string[] = []) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(sessionQueryOptions.queryKey, {
        id: 1,
        name: 'Ana Ejemplo',
        email: 'ana@clini.app',
        two_factor_enabled: false,
        permissions,
    });
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <PanelLayout>
                    <Outlet />
                </PanelLayout>
            </QueryClientProvider>
        ),
    });
    const settingsRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/ajustes',
        staticData: { secondaryNav: SETTINGS_NAV },
        component: () => <Outlet />,
    });
    const settingsChildren = ['/cuenta', '/profesionales'].map((p) =>
        createRoute({
            getParentRoute: () => settingsRoute,
            path: p,
            component: () => <h1>Página</h1>,
        }),
    );
    const agendaRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/agenda',
        component: () => <h1>Agenda</h1>,
    });
    const router = createRouter({
        routeTree: rootRoute.addChildren([
            settingsRoute.addChildren(settingsChildren),
            agendaRoute,
        ]),
        history: createMemoryHistory({ initialEntries: [path] }),
    });
    render(<RouterProvider router={router} />);
}

describe('secondary navigation', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.get).mockResolvedValue({ data: { data: null } });
    });

    it("shows the bar a parent route declares on its child's page, marking the current item", async () => {
        renderLayoutAt('/ajustes/cuenta', ['memberships.view']);

        const bar = await screen.findByRole('navigation', {
            name: 'Secciones de Ajustes',
        });
        expect(
            within(bar)
                .getByRole('link', { name: 'Cuenta' })
                .getAttribute('aria-current'),
        ).toBe('page');
        expect(
            within(bar)
                .getByRole('link', { name: 'Profesionales' })
                .getAttribute('aria-current'),
        ).toBeNull();
    });

    it('applies the permission rules of the main navigation', async () => {
        renderLayoutAt('/ajustes/cuenta');

        const bar = await screen.findByRole('navigation', {
            name: 'Secciones de Ajustes',
        });
        expect(
            within(bar).queryByRole('link', { name: 'Profesionales' }),
        ).toBeNull();
    });

    it('shows no bar on a page whose route declares none', async () => {
        renderLayoutAt('/agenda');

        await screen.findByRole('heading', { name: 'Agenda' });
        expect(
            screen.queryByRole('navigation', { name: 'Secciones de Ajustes' }),
        ).toBeNull();
    });
});
