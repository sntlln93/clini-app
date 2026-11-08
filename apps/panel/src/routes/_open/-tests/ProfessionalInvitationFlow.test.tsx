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

function businessError(code: string, context: Record<string, unknown> = {}) {
    return {
        isAxiosError: true,
        response: {
            status: 409,
            data: { error: { code, message: 'x', context } },
        },
    };
}

function renderInvitation() {
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
    const routeTree = rootRoute.addChildren([
        createRoute({
            getParentRoute: () => rootRoute,
            path: '/invitaciones/$token',
            component: () => <AcceptInvitationForm token={TOKEN} />,
        }),
        createRoute({
            getParentRoute: () => rootRoute,
            path: '/agenda',
            component: () => <div>Agenda</div>,
        }),
    ]);
    render(
        <RouterProvider
            router={createRouter({
                routeTree,
                history: createMemoryHistory({
                    initialEntries: [`/invitaciones/${TOKEN}`],
                }),
            })}
        />,
    );
}

function lookUp(dni: string) {
    fireEvent.change(screen.getByLabelText('DNI'), { target: { value: dni } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar mis datos' }));
}

// #417: a professional invitation starts with the DNI, and the name comes from
// the Buscador Nacional de Profesionales de la Salud.
describe('professional invitation', () => {
    beforeEach(() => {
        vi.mocked(api.get)
            .mockReset()
            .mockResolvedValue({
                data: {
                    email: 'lucia@clini.app',
                    organization_name: 'Consultorio Ana',
                    requires_registration: true,
                    professional: true,
                    document_lookups_left: 3,
                },
            });
        vi.mocked(api.post).mockReset();
        vi.mocked(refreshCsrfCookie)
            .mockReset()
            .mockResolvedValue(undefined as never);
    });

    it('asks for the DNI first, says where the data comes from, and no name or password yet', async () => {
        renderInvitation();

        await screen.findByLabelText('DNI');
        screen.getByText(/Buscador Nacional de Profesionales de la Salud/);
        screen.getByText('Te quedan 3 consultas.');
        expect(screen.queryByLabelText('Nombre')).toBeNull();
        expect(screen.queryByLabelText('Contraseña')).toBeNull();
    });

    it('looks the DNI up without dots, then shows the registry’s name read-only and creates the account with a password', async () => {
        vi.mocked(api.post)
            .mockResolvedValueOnce({
                data: {
                    data: {
                        name: 'Lucia De La Fuente',
                        account: null,
                        document_lookups_left: 2,
                    },
                },
            })
            .mockResolvedValueOnce({ data: { message: 'ok' } });
        renderInvitation();
        await screen.findByLabelText('DNI');

        lookUp('99.000.003');

        const name = await screen.findByLabelText('Nombre');
        expect(api.post).toHaveBeenCalledWith(
            `/invitations/${TOKEN}/document-lookups`,
            { document_number: '99000003' },
        );
        expect((name as HTMLInputElement).value).toBe('Lucia De La Fuente');
        expect(name.hasAttribute('readonly')).toBe(true);

        fireEvent.change(screen.getByLabelText('Contraseña'), {
            target: { value: 'secreta-larga-123' },
        });
        fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
            target: { value: 'secreta-larga-123' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Crear cuenta y unirme' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenLastCalledWith(`/invitations/${TOKEN}`, {
                password: 'secreta-larga-123',
                password_confirmation: 'secreta-larga-123',
            }),
        );
    });

    it('asks an existing account for its password and, if it has one, its code, by its masked email', async () => {
        vi.mocked(api.post)
            .mockResolvedValueOnce({
                data: {
                    data: {
                        name: 'Lucia De La Fuente',
                        account: {
                            email: 'l•••@clini.app',
                            has_document: true,
                        },
                        document_lookups_left: 2,
                    },
                },
            })
            .mockResolvedValueOnce({ data: { message: 'ok' } });
        renderInvitation();
        await screen.findByLabelText('DNI');

        lookUp('99000003');

        await screen.findByText(/Ya tenés una cuenta en Clini con este DNI/);
        screen.getByText(/l•••@clini\.app/);
        expect(screen.queryByLabelText('Confirmar contraseña')).toBeNull();

        fireEvent.change(screen.getByLabelText('Contraseña de tu cuenta'), {
            target: { value: 'mi-clave' },
        });
        fireEvent.change(screen.getByLabelText('Código de verificación'), {
            target: { value: '123456' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Aceptar invitación' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenLastCalledWith(`/invitations/${TOKEN}`, {
                password: 'mi-clave',
                code: '123456',
            }),
        );
    });

    it('says when the registry has nobody under the DNI, with the lookups left', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            businessError('memberships.invitation_document_not_found', {
                document_lookups_left: 1,
            }),
        );
        renderInvitation();
        await screen.findByLabelText('DNI');

        lookUp('30000001');

        await screen.findByText(/no tiene a nadie con ese DNI/);
        screen.getByText('Te queda 1 consulta.');
    });

    it('closes the form once the lookups are spent', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            businessError('memberships.invitation_lookups_exhausted'),
        );
        renderInvitation();
        await screen.findByLabelText('DNI');

        lookUp('30000001');

        await screen.findByText(/Se agotaron las consultas de DNI/);
        expect(screen.queryByLabelText('DNI')).toBeNull();
    });

    it('sends a recovery code when the invitee switches to one', async () => {
        vi.mocked(api.post)
            .mockResolvedValueOnce({
                data: {
                    data: {
                        name: 'Lucia De La Fuente',
                        account: {
                            email: 'l•••@clini.app',
                            has_document: true,
                        },
                        document_lookups_left: 2,
                    },
                },
            })
            .mockResolvedValueOnce({ data: { message: 'ok' } });
        renderInvitation();
        await screen.findByLabelText('DNI');
        lookUp('99000003');

        fireEvent.change(
            await screen.findByLabelText('Contraseña de tu cuenta'),
            { target: { value: 'mi-clave' } },
        );
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Usar un código de recuperación',
            }),
        );
        fireEvent.change(screen.getByLabelText('Código de recuperación'), {
            target: { value: 'abcde-fghjk' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Aceptar invitación' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenLastCalledWith(`/invitations/${TOKEN}`, {
                password: 'mi-clave',
                recovery_code: 'abcde-fghjk',
            }),
        );
    });

    it('tells the invited email’s account it takes this DNI, not that it already has it', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: {
                data: {
                    name: 'Lucia De La Fuente',
                    account: { email: 'l•••@clini.app', has_document: false },
                    document_lookups_left: 2,
                },
            },
        });
        renderInvitation();
        await screen.findByLabelText('DNI');
        lookUp('99000003');

        await screen.findByText(/con el mail invitado/);
        expect(screen.queryByText(/con este DNI/)).toBeNull();
    });

    it('goes back to the DNI saying why when what it found is gone', async () => {
        vi.mocked(api.post)
            .mockResolvedValueOnce({
                data: {
                    data: {
                        name: 'Lucia De La Fuente',
                        account: null,
                        document_lookups_left: 2,
                    },
                },
            })
            .mockRejectedValueOnce(
                businessError('memberships.invitation_document_required'),
            );
        renderInvitation();
        await screen.findByLabelText('DNI');
        lookUp('99000003');

        fireEvent.change(await screen.findByLabelText('Contraseña'), {
            target: { value: 'secreta-larga-123' },
        });
        fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
            target: { value: 'secreta-larga-123' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Crear cuenta y unirme' }),
        );

        await screen.findByText(
            'Primero ingresá tu DNI para buscar tus datos.',
        );
        screen.getByLabelText('DNI');
        screen.getByText('Te quedan 2 consultas.');
    });

    it('ties the lookups left to the DNI field', async () => {
        renderInvitation();
        const input = await screen.findByLabelText('DNI');

        const hint = document.getElementById(
            input.getAttribute('aria-describedby') ?? '',
        );
        expect(hint?.textContent).toBe('Te quedan 3 consultas.');
    });
});
