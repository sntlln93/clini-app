import { api, refreshCsrfCookie } from '@/lib/api';
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

function renderAcceptInvitationForm(sessionEmail: string | null = null) {
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
        component: () => (
            <AcceptInvitationForm token={TOKEN} sessionEmail={sessionEmail} />
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
    const routeTree = rootRoute.addChildren([
        invitationRoute,
        agendaRoute,
        loginRoute,
    ]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({
            initialEntries: [`/invitaciones/${TOKEN}`],
        }),
    });
    render(<RouterProvider router={router} />);

    return { queryClient };
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
        expect(
            screen.getByRole('heading', {
                level: 1,
                name: 'Invitación no disponible',
            }),
        ).not.toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Aceptar invitación' }),
        ).toBeNull();
        expect(
            screen
                .getByRole('button', { name: 'Ir a iniciar sesión' })
                .getAttribute('href'),
        ).toBe('/login');
    });

    it('blocks a password shorter than 8 characters before submitting, with the rule shown upfront', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            data: {
                email: 'ana@clini.app',
                organization_name: 'Consultorio Ana',
                requires_registration: true,
            },
        });
        renderAcceptInvitationForm();

        fireEvent.change(await screen.findByLabelText('Nombre'), {
            target: { value: 'Ana Gomez' },
        });
        expect(screen.getByText('Mínimo 8 caracteres.')).not.toBeNull();
        fireEvent.change(screen.getByLabelText('Contraseña'), {
            target: { value: 'corta' },
        });
        fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
            target: { value: 'corta' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Crear cuenta y unirme' }),
        );

        await screen.findByText(
            'La contraseña debe tener al menos 8 caracteres.',
        );
        expect(api.post).not.toHaveBeenCalled();
    });

    it('warns before accepting when the open session belongs to another email', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            data: {
                email: 'ana@clini.app',
                organization_name: 'Consultorio Ana',
                requires_registration: false,
            },
        });
        renderAcceptInvitationForm('beto@clini.app');

        expect(
            await screen.findByText(
                'Tenés una sesión abierta como beto@clini.app; al aceptar vas a ingresar como ana@clini.app.',
            ),
        ).not.toBeNull();
    });

    it("replaces another account's cached session and data with the invited user's before reaching /agenda", async () => {
        vi.mocked(api.get).mockImplementation((url: string) =>
            Promise.resolve(
                url === '/me'
                    ? { data: { id: 7, name: 'Ana', email: 'ana@clini.app' } }
                    : {
                          data: {
                              email: 'ana@clini.app',
                              organization_name: 'Consultorio Ana',
                              requires_registration: false,
                          },
                      },
            ),
        );
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { message: 'Invitación aceptada.' },
        });
        const { queryClient } = renderAcceptInvitationForm('beto@clini.app');
        queryClient.setQueryData(sessionQueryOptions.queryKey, {
            id: 3,
            name: 'Beto',
            email: 'beto@clini.app',
        });
        queryClient.setQueryData(['patients', { q: '', page: 1 }], {
            data: [{ id: 1, name: 'Paciente de Beto' }],
        });

        fireEvent.click(
            await screen.findByRole('button', { name: 'Aceptar invitación' }),
        );

        await screen.findByText('Agenda');
        expect(
            queryClient.getQueryData(sessionQueryOptions.queryKey),
        ).toMatchObject({ id: 7, email: 'ana@clini.app' });
        expect(
            queryClient.getQueryData(['patients', { q: '', page: 1 }]),
        ).toBeUndefined();
    });

    it('shows no session warning when the open session is the invited email', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            data: {
                email: 'ana@clini.app',
                organization_name: 'Consultorio Ana',
                requires_registration: false,
            },
        });
        renderAcceptInvitationForm('ANA@clini.app');

        await screen.findByRole('button', { name: 'Aceptar invitación' });
        expect(screen.queryByText(/Tenés una sesión abierta/)).toBeNull();
    });

    it('renders the skeleton status region while the invitation query is pending', async () => {
        vi.mocked(api.get).mockReturnValueOnce(new Promise(() => {}));
        renderAcceptInvitationForm();

        expect(await screen.findByRole('status')).not.toBeNull();
    });
});
