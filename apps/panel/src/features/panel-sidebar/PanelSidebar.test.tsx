import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { planQueryOptions } from '@/lib/plan';
import { sessionQueryOptions } from '@/lib/session';
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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PanelSidebar } from './PanelSidebar';
import { isNavItemActive, navItems } from './nav-items';

function renderSidebarAt(path: string, permissions?: string[], plan?: Plan) {
    const queryClient = new QueryClient();
    if (plan) {
        queryClient.setQueryData(planQueryOptions.queryKey, plan);
    }
    queryClient.setQueryData(sessionQueryOptions.queryKey, {
        id: 1,
        name: 'Ana Ejemplo',
        email: 'ana@clini.app',
        two_factor_enabled: false,
        ...(permissions ? { permissions } : {}),
    });
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <SidebarProvider>
                        <SidebarTrigger />
                        <PanelSidebar />
                        <Outlet />
                    </SidebarProvider>
                </TooltipProvider>
            </QueryClientProvider>
        ),
    });
    const paths = [
        '/agenda',
        '/sala-de-espera',
        '/pacientes',
        '/profesionales',
        '/disponibilidad',
        '/reportes',
        '/ajustes',
    ];
    const children = paths.map((p) =>
        createRoute({
            getParentRoute: () => rootRoute,
            path: p,
            component: () => null,
        }),
    );
    const routeTree = rootRoute.addChildren(children);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: [path] }),
    });
    render(<RouterProvider router={router} />);
}

function CollapseHarness() {
    const [open, setOpen] = usePersistedState('sidebar:open', true);
    return (
        <TooltipProvider>
            <SidebarProvider open={open} onOpenChange={setOpen}>
                <SidebarTrigger />
            </SidebarProvider>
        </TooltipProvider>
    );
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
});

describe('PanelSidebar', () => {
    it("shows the manifest's isotype for each theme next to the brand name", async () => {
        renderSidebarAt('/agenda');

        const sidebar = await screen.findByRole('navigation', {
            name: 'Barra lateral',
        });
        expect(within(sidebar).getByText(brand.name)).toBeTruthy();
        expect(
            [...sidebar.querySelectorAll('img')].map((img) => ({
                src: img.getAttribute('src'),
                alt: img.getAttribute('alt'),
            })),
        ).toEqual([
            { src: brandAssetUrl(brand.assets.isotype.light), alt: '' },
            { src: brandAssetUrl(brand.assets.isotype.dark), alt: '' },
        ]);
    });

    it('marks the active route item with aria-current="page"', async () => {
        renderSidebarAt('/pacientes');
        const active = await screen.findByRole('link', { name: /Pacientes/ });
        expect(active.getAttribute('aria-current')).toBe('page');
        const inactive = screen.getByRole('link', { name: /Agenda/ });
        expect(inactive.getAttribute('aria-current')).toBeNull();
    });
});

describe('PanelSidebar permission gating', () => {
    it('renders Profesionales when the session has the memberships.view permission', async () => {
        renderSidebarAt('/agenda', ['memberships.view']);

        const link = await screen.findByRole('link', {
            name: /Profesionales/,
        });
        expect(link.getAttribute('href')).toBe('/profesionales');
    });

    it('hides Profesionales when the session lacks the memberships.view permission', async () => {
        renderSidebarAt('/agenda', [
            'patients.view',
            'availability.view',
            'appointments.view',
        ]);

        await screen.findByRole('link', { name: /Agenda/ });
        expect(
            screen.queryByRole('link', { name: /Profesionales/ }),
        ).toBeNull();
    });

    it('still renders items with no declared permission when memberships.view is missing', async () => {
        renderSidebarAt('/agenda', [
            'patients.view',
            'availability.view',
            'appointments.view',
        ]);

        const alwaysVisible = navItems.filter((item) => !item.permissions);
        for (const item of alwaysVisible) {
            const link = await screen.findByRole('link', {
                name: new RegExp(item.label),
            });
            expect(link.getAttribute('href')).toBe(item.to);
        }
    });
});

describe('PanelSidebar Reportes entry', () => {
    it.each([['reports.view'], ['reports.view.own']])(
        'renders Reportes on Center with %s',
        async (permission) => {
            renderSidebarAt('/agenda', [permission], buildPlan('center'));

            const link = await screen.findByRole('link', { name: 'Reportes' });
            expect(link.getAttribute('href')).toBe('/reportes');
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
        renderSidebarAt('/agenda', [...permissions], buildPlan(planId));

        await screen.findByRole('link', { name: 'Agenda' });
        expect(screen.queryByRole('link', { name: 'Reportes' })).toBeNull();
    });
});

describe('sidebar collapse toggle', () => {
    it('hides Sala de espera on a plan without the waiting room', async () => {
        renderSidebarAt('/agenda', undefined, buildPlan('free'));

        await screen.findByRole('link', { name: 'Agenda' });
        expect(
            screen.queryByRole('link', { name: 'Sala de espera' }),
        ).toBeNull();
    });

    it.each([
        ['a paid plan', buildPlan('practice')],
        ['the plan not loaded', undefined],
    ])('renders Sala de espera with %s', async (_label, plan) => {
        renderSidebarAt('/agenda', undefined, plan);

        expect(
            await screen.findByRole('link', { name: 'Sala de espera' }),
        ).toBeTruthy();
    });

    it('persists the toggled open state', () => {
        render(<CollapseHarness />);
        const trigger = screen.getByRole('button', { name: /toggle sidebar/i });
        fireEvent.click(trigger);
        expect(localStorage.getItem('sidebar:open')).toBe('false');
        fireEvent.click(trigger);
        expect(localStorage.getItem('sidebar:open')).toBe('true');
    });
});

describe('PanelSidebar rail', () => {
    it('mounts the rail on desktop with the expected accessible name and slot', async () => {
        renderSidebarAt('/agenda');

        const rail = await screen.findByRole('button', {
            name: 'Alternar barra lateral',
        });
        expect(rail.getAttribute('data-slot')).toBe('sidebar-rail');
    });

    it('collapses the sidebar when the rail is clicked', async () => {
        renderSidebarAt('/agenda');

        const rail = await screen.findByRole('button', {
            name: 'Alternar barra lateral',
        });
        const sidebar = document.querySelector(
            '[data-slot="sidebar"][data-state]',
        );
        expect(sidebar?.getAttribute('data-state')).toBe('expanded');

        fireEvent.click(rail);
        expect(sidebar?.getAttribute('data-state')).toBe('collapsed');
    });

    it('is not mounted on mobile', async () => {
        const originalInnerWidth = window.innerWidth;
        const originalMatchMedia = window.matchMedia;
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 375,
        });
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            configurable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: true,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });

        try {
            renderSidebarAt('/agenda');
            await waitFor(() => {
                expect(
                    document.querySelector('[data-slot="sidebar-wrapper"]'),
                ).not.toBeNull();
            });
            expect(
                screen.queryByRole('button', {
                    name: 'Alternar barra lateral',
                }),
            ).toBeNull();
        } finally {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: originalInnerWidth,
            });
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                configurable: true,
                value: originalMatchMedia,
            });
        }
    });
});

describe('PanelSidebar mobile drawer', () => {
    const originalInnerWidth = window.innerWidth;

    afterEach(() => {
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: originalInnerWidth,
        });
    });

    it('closes the drawer when a nav item is tapped', async () => {
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 375,
        });
        renderSidebarAt('/agenda');

        fireEvent.click(
            await screen.findByRole('button', { name: /toggle sidebar/i }),
        );
        const drawer = await screen.findByRole('dialog');
        fireEvent.click(
            within(drawer).getByRole('link', { name: /Pacientes/ }),
        );

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeNull();
        });
    });
});
