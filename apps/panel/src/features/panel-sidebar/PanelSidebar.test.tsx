import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePersistedState } from '@/hooks/use-persisted-state';
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
import { isNavItemActive } from './nav-items';

function renderSidebarAt(path: string) {
    const rootRoute = createRootRoute({
        component: () => (
            <TooltipProvider>
                <SidebarProvider>
                    <PanelSidebar />
                    <Outlet />
                </SidebarProvider>
            </TooltipProvider>
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
