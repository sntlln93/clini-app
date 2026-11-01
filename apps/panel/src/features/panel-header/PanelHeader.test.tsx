import { planQueryOptions } from '@/lib/plan';
import { sessionQueryOptions, type SessionUser } from '@/lib/session';
import { buildPlan } from '@/tests/fixtures/plan';
import type { Plan } from '@/types/plan';
import { brand, brandAssetUrl } from '@clini/brand';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { isNavItemActive, navItems } from '../panel-nav/nav-items';
import { PanelHeader } from './PanelHeader';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const user: SessionUser = {
    id: 1,
    name: 'Ana Ejemplo',
    email: 'ana@clini.app',
    two_factor_enabled: false,
};

function renderHeaderAt(
    path: string,
    { permissions, plan }: { permissions?: string[]; plan?: Plan } = {},
) {
    const queryClient = new QueryClient();
    if (plan) {
        queryClient.setQueryData(planQueryOptions.queryKey, plan);
    }
    queryClient.setQueryData(sessionQueryOptions.queryKey, {
        ...user,
        ...(permissions ? { permissions } : {}),
    });
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <PanelHeader />
                <Outlet />
            </QueryClientProvider>
        ),
    });
    const paths = [
        '/',
        ...navItems.map((item) => item.to),
        '/pacientes/$id',
        '/ajustes',
    ];
    const routeTree = rootRoute.addChildren(
        paths.map((p) =>
            createRoute({
                getParentRoute: () => rootRoute,
                path: p,
                component: () => null,
            }),
        ),
    );
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: [path] }),
    });
    render(<RouterProvider router={router} />);
}

async function mainNav() {
    return screen.findByRole('navigation', { name: 'Navegación principal' });
}

describe('isNavItemActive', () => {
    it('matches the exact path', () => {
        expect(isNavItemActive('/agenda', '/agenda')).toBe(true);
    });

    it('matches nested child paths', () => {
        expect(isNavItemActive('/pacientes/42', '/pacientes')).toBe(true);
    });

    it('does not match a different sibling path', () => {
        expect(isNavItemActive('/pacientes', '/agenda')).toBe(false);
    });

    it('matches only the path itself for an exact item, like a section index', () => {
        expect(
            isNavItemActive('/disponibilidad', '/disponibilidad', true),
        ).toBe(true);
        expect(
            isNavItemActive('/disponibilidad/', '/disponibilidad', true),
        ).toBe(true);
        expect(
            isNavItemActive(
                '/disponibilidad/excepciones',
                '/disponibilidad',
                true,
            ),
        ).toBe(false);
    });
});

describe('PanelHeader', () => {
    it("links the manifest's isotype and the brand name to the home page", async () => {
        renderHeaderAt('/agenda');

        const home = await screen.findByRole('link', { name: brand.name });
        expect(home.getAttribute('href')).toBe('/');
        expect(
            [...home.querySelectorAll('img')].map((img) => ({
                src: img.getAttribute('src'),
                alt: img.getAttribute('alt'),
            })),
        ).toEqual([
            { src: brandAssetUrl(brand.assets.isotype.light), alt: '' },
            { src: brandAssetUrl(brand.assets.isotype.dark), alt: '' },
        ]);
    });

    it('marks the active route item with aria-current="page"', async () => {
        renderHeaderAt('/pacientes/42');
        const nav = await mainNav();

        expect(
            within(nav)
                .getByRole('link', { name: 'Pacientes' })
                .getAttribute('aria-current'),
        ).toBe('page');
        expect(
            within(nav)
                .getByRole('link', { name: 'Agenda' })
                .getAttribute('aria-current'),
        ).toBeNull();
    });

    it('holds the user menu with the session user', async () => {
        renderHeaderAt('/agenda');

        expect(
            await screen.findByRole('button', { name: /Ana Ejemplo/ }),
        ).toBeTruthy();
    });
});

describe('main navigation gating', () => {
    it('renders Profesionales with the memberships.view permission', async () => {
        renderHeaderAt('/agenda', { permissions: ['memberships.view'] });

        const link = within(await mainNav()).getByRole('link', {
            name: 'Profesionales',
        });
        expect(link.getAttribute('href')).toBe('/profesionales');
    });

    it('hides Profesionales without the memberships.view permission, and keeps the ungated items', async () => {
        renderHeaderAt('/agenda', { permissions: ['patients.view'] });
        const nav = await mainNav();

        expect(
            within(nav).queryByRole('link', { name: 'Profesionales' }),
        ).toBeNull();
        for (const item of navItems.filter((i) => !i.permissions)) {
            expect(
                within(nav)
                    .getByRole('link', { name: item.label })
                    .getAttribute('href'),
            ).toBe(item.to);
        }
    });

    it.each([['reports.view'], ['reports.view.own']])(
        'renders Reportes on Center with %s',
        async (permission) => {
            renderHeaderAt('/agenda', {
                permissions: [permission],
                plan: buildPlan('center'),
            });

            expect(
                within(await mainNav()).getByRole('link', { name: 'Reportes' }),
            ).toBeTruthy();
        },
    );

    it.each([
        [
            'on Practice, which does not include it',
            ['reports.view'],
            'practice',
        ],
        ['without any reports permission', ['appointments.view'], 'center'],
    ] as const)('hides Reportes %s', async (_label, permissions, planId) => {
        renderHeaderAt('/agenda', {
            permissions: [...permissions],
            plan: buildPlan(planId),
        });

        expect(
            within(await mainNav()).queryByRole('link', { name: 'Reportes' }),
        ).toBeNull();
    });

    it('hides Sala de espera on a plan without the waiting room', async () => {
        renderHeaderAt('/agenda', { plan: buildPlan('free') });

        expect(
            within(await mainNav()).queryByRole('link', {
                name: 'Sala de espera',
            }),
        ).toBeNull();
    });

    it.each([
        ['a paid plan', buildPlan('practice')],
        ['the plan not loaded', undefined],
    ])('renders Sala de espera with %s', async (_label, plan) => {
        renderHeaderAt('/agenda', { plan });

        expect(
            within(await mainNav()).getByRole('link', {
                name: 'Sala de espera',
            }),
        ).toBeTruthy();
    });
});

describe('mobile menu', () => {
    it('opens the navigation in a drawer that closes when a link is tapped', async () => {
        renderHeaderAt('/agenda');

        fireEvent.click(
            await screen.findByRole('button', { name: 'Abrir menú' }),
        );
        const drawer = await screen.findByRole('dialog');
        const nav = within(drawer).getByRole('navigation', {
            name: 'Navegación principal',
        });
        expect(
            within(nav)
                .getByRole('link', { name: 'Agenda' })
                .getAttribute('aria-current'),
        ).toBe('page');

        fireEvent.click(within(nav).getByRole('link', { name: 'Pacientes' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('closes with its own Spanish close button', async () => {
        renderHeaderAt('/agenda');

        fireEvent.click(
            await screen.findByRole('button', { name: 'Abrir menú' }),
        );
        const drawer = await screen.findByRole('dialog');
        fireEvent.click(
            within(drawer).getByRole('button', { name: 'Cerrar menú' }),
        );

        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });
});
