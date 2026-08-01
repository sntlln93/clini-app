import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePersistedState } from '@/hooks/use-persisted-state';
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
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PanelSidebar } from './PanelSidebar';
import { isNavItemActive, navItems } from './nav-items';

function renderSidebarAt(path: string, permissions?: string[]) {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryOptions.queryKey, {
        id: 1,
        name: 'Ana Ejemplo',
        email: 'ana@clini.app',
        ...(permissions ? { permissions } : {}),
    });
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <SidebarProvider>
                        <PanelSidebar />
                        <Outlet />
                    </SidebarProvider>
                </TooltipProvider>
            </QueryClientProvider>
        ),
    });
    const paths = [
        '/agenda',
        '/pacientes',
        '/profesionales',
        '/disponibilidad',
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

        const alwaysVisible = navItems.filter((item) => !item.permission);
        for (const item of alwaysVisible) {
            const link = await screen.findByRole('link', {
                name: new RegExp(item.label),
            });
            expect(link.getAttribute('href')).toBe(item.to);
        }
    });
});

describe('sidebar collapse toggle', () => {
    it('persists the toggled open state', () => {
        render(<CollapseHarness />);
        const trigger = screen.getByRole('button', { name: /toggle sidebar/i });
        fireEvent.click(trigger);
        expect(localStorage.getItem('sidebar:open')).toBe('false');
        fireEvent.click(trigger);
        expect(localStorage.getItem('sidebar:open')).toBe('true');
    });
});
