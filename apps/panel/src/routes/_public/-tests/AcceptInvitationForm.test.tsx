import { api, refreshCsrfCookie } from '@/lib/api';
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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AcceptInvitationForm } from '../-components/AcceptInvitationForm';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
    refreshCsrfCookie: vi.fn(),
}));

const TOKEN = 'abc123';

function invitationDomainError() {
    return {
        isAxiosError: true,
        response: {
            status: 404,
            data: {
                error: {
                    code: 'memberships.invitation_invalid_or_expired',
                    message: 'The invitation is invalid or has expired.',
                    context: {},
                },
            },
        },
    };
}

function renderAcceptInvitationForm() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    const invitationRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/invitaciones/$token',
        component: () => <AcceptInvitationForm token={TOKEN} />,
    });
    const agendaRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/agenda',
        component: () => <div>Agenda</div>,
    });
    const routeTree = rootRoute.addChildren([invitationRoute, agendaRoute]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({
            initialEntries: [`/invitaciones/${TOKEN}`],
        }),
    });
    render(<RouterProvider router={router} />);
}

describe('AcceptInvitationForm', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
        vi.mocked(refreshCsrfCookie)
            .mockReset()
            .mockResolvedValue(undefined as never);
    });

    it('renders name and password fields and sends them when registration is required', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            data: {
                email: 'ana@clini.app',
                organization_name: 'Consultorio Ana',
                requires_registration: true,
            },
        });
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { message: 'Invitación aceptada.' },
        });
        renderAcceptInvitationForm();

        fireEvent.change(await screen.findByLabelText('Nombre'), {
            target: { value: 'Ana Gomez' },
        });
        fireEvent.change(screen.getByLabelText('Contraseña'), {
            target: { value: 'secreta123' },
        });
        fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
            target: { value: 'secreta123' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Crear cuenta y unirme' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(`/invitations/${TOKEN}`, {
                name: 'Ana Gomez',
                password: 'secreta123',
                password_confirmation: 'secreta123',
            }),
        );
    });

    it('shows a plain confirm action with no registration fields when registration is not required', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            data: {
                email: 'ana@clini.app',
                organization_name: 'Consultorio Ana',
                requires_registration: false,
            },
        });
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { message: 'Invitación aceptada.' },
        });
        renderAcceptInvitationForm();

        await screen.findByRole('button', { name: 'Aceptar invitación' });
        expect(screen.queryByLabelText('Nombre')).toBeNull();
        expect(screen.queryByLabelText('Contraseña')).toBeNull();
        expect(screen.queryByLabelText('Confirmar contraseña')).toBeNull();

        fireEvent.click(
            screen.getByRole('button', { name: 'Aceptar invitación' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(`/invitations/${TOKEN}`, {}),
        );
    });

    it('renders the catalog Spanish copy for the invitation domain error, never the backend message, with no hint about registration', async () => {
        vi.mocked(api.get).mockRejectedValueOnce(invitationDomainError());
        renderAcceptInvitationForm();

        await screen.findByText(
            'La invitación no es válida o ya expiró. Pedile a quien te invitó que te envíe una nueva.',
        );
        expect(
            screen.queryByText('The invitation is invalid or has expired.'),
        ).toBeNull();
        expect(screen.queryByLabelText('Nombre')).toBeNull();
        expect(screen.queryByLabelText('Contraseña')).toBeNull();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('renders the skeleton status region while the invitation query is pending', async () => {
        vi.mocked(api.get).mockReturnValueOnce(new Promise(() => {}));
        renderAcceptInvitationForm();

        expect(await screen.findByRole('status')).not.toBeNull();
    });
});
