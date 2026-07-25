import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProfileMenu } from './ProfileMenu';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const user = { id: 1, name: 'Ana Ejemplo', email: 'ana@clini.app' };

function renderProfileMenu() {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryOptions.queryKey, user);

    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <SidebarProvider>
                        <ProfileMenu />
                        <Outlet />
                    </SidebarProvider>
                </TooltipProvider>
            </QueryClientProvider>
        ),
    });
    const agendaRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/agenda',
        component: () => <div>Agenda</div>,
    });
    const loginRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/login',
        component: () => <div>Login</div>,
    });
    const routeTree = rootRoute.addChildren([agendaRoute, loginRoute]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/agenda'] }),
    });
    render(<RouterProvider router={router} />);
}

describe('ProfileMenu', () => {
    it("shows the session user's real name and email", async () => {
        renderProfileMenu();

        await screen.findByText(user.name);
        screen.getByText(user.email);
    });

    it('logs out via POST /logout and navigates to /login when "Cerrar sesión" is clicked', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({});
        renderProfileMenu();

        const trigger = await screen.findByRole('button', {
            name: new RegExp(user.name),
        });
        fireEvent.click(trigger);

        const logoutItem = await screen.findByText('Cerrar sesión');
        const logoutMenuItem = logoutItem.closest(
            '[data-slot="dropdown-menu-item"]',
        );
        expect(logoutMenuItem?.getAttribute('data-disabled')).toBeNull();
        fireEvent.click(logoutItem);

        await waitFor(() => expect(api.post).toHaveBeenCalledWith('/logout'));
        await screen.findByText('Login');
    });
});
