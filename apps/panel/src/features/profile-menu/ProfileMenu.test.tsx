import { api } from '@/lib/api';
import { sessionQueryOptions, type SessionUser } from '@/lib/session';
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
import { ProfileMenu } from './ProfileMenu';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const user: SessionUser = {
    id: 1,
    name: 'Ana Ejemplo',
    email: 'ana@clini.app',
    two_factor_enabled: false,
    organization: {
        id: 1,
        name: 'Consultorio Norte',
        timezone: 'America/Argentina/Buenos_Aires',
        province: null,
        slug: 'consultorio-norte',
    },
};

function renderProfileMenu(session: SessionUser = user) {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryOptions.queryKey, session);

    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <ProfileMenu />
                <Outlet />
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
    it('names the session user and the active organization on its button, and adds the email inside', async () => {
        renderProfileMenu();

        const trigger = await screen.findByRole('button', {
            name: 'Ana Ejemplo, Consultorio Norte',
        });
        expect(
            within(trigger)
                .getByText('Consultorio Norte')
                .getAttribute('title'),
        ).toBe('Consultorio Norte');

        fireEvent.click(trigger);
        expect(await screen.findByText(user.email)).toBeTruthy();
    });

    it('says "Sin consultorio" when the session has no organization', async () => {
        renderProfileMenu({ ...user, organization: null });

        expect(
            await screen.findByRole('button', {
                name: 'Ana Ejemplo, Sin consultorio',
            }),
        ).toBeTruthy();
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
