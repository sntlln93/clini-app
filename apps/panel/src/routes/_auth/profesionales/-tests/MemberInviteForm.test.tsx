import { api } from '@/lib/api';
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
import { MemberInviteForm } from '../-components/MemberInviteForm';

vi.mock('@/lib/api', () => ({
    api: { post: vi.fn() },
}));

function unprocessableError(data: unknown) {
    return { isAxiosError: true, response: { status: 422, data } };
}

function serverError() {
    return { isAxiosError: true, response: { status: 500, data: {} } };
}

function renderMemberInviteForm() {
    const queryClient = new QueryClient();
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    const nuevoRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/profesionales/nuevo',
        component: MemberInviteForm,
    });
    const profesionalesRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/profesionales',
        component: () => <div>Profesionales</div>,
    });
    const routeTree = rootRoute.addChildren([nuevoRoute, profesionalesRoute]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({
            initialEntries: ['/profesionales/nuevo'],
        }),
    });
    render(<RouterProvider router={router} />);
}

async function fillInviteForm() {
    fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
        target: { value: 'nuevo@clini.app' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Profesional' }));
}

describe('MemberInviteForm', () => {
    it('posts the expected payload to /memberships/invitations on submit', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { message: 'Invitación enviada.' },
        });
        renderMemberInviteForm();

        await fillInviteForm();
        fireEvent.click(
            screen.getByRole('button', { name: 'Enviar invitación' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/memberships/invitations', {
                email: 'nuevo@clini.app',
                roles: ['professional'],
            }),
        );
    });

    it('shows a success message and does not navigate on a successful invitation', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { message: 'Invitación enviada.' },
        });
        renderMemberInviteForm();

        await fillInviteForm();
        fireEvent.click(
            screen.getByRole('button', { name: 'Enviar invitación' }),
        );

        const status = await screen.findByRole('status');
        expect(status.textContent).toBe(
            'Le enviamos la invitación a nuevo@clini.app. Cuando la acepte, va a aparecer en el listado.',
        );
        expect(screen.queryByText('Profesionales')).toBeNull();
        expect(
            screen
                .getByRole('button', { name: 'Volver al listado' })
                .getAttribute('href'),
        ).toBe('/profesionales');
    });

    it('brings back an empty form from «Invitar a otra persona»', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { message: 'Invitación enviada.' },
        });
        renderMemberInviteForm();

        await fillInviteForm();
        fireEvent.click(
            screen.getByRole('button', { name: 'Enviar invitación' }),
        );
        fireEvent.click(
            await screen.findByRole('button', {
                name: 'Invitar a otra persona',
            }),
        );

        const email = (await screen.findByLabelText(
            'Correo electrónico',
        )) as HTMLInputElement;
        expect(email.value).toBe('');
        expect(
            screen
                .getByRole('checkbox', { name: 'Profesional' })
                .getAttribute('aria-checked'),
        ).toBe('false');
    });

    it('warns that the owner role grants full control only once it is checked', async () => {
        renderMemberInviteForm();
        const warning = /Como Propietario va a tener control total/;

        await screen.findByLabelText('Correo electrónico');
        expect(screen.queryByText(warning)).toBeNull();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Propietario' }));

        await screen.findByText(warning);
    });

    it('surfaces a 422 email error under that field', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            unprocessableError({
                message: 'Los datos ingresados no son válidos.',
                errors: {
                    email: ['Ese correo ya fue invitado.'],
                },
            }),
        );
        renderMemberInviteForm();

        await fillInviteForm();
        fireEvent.click(
            screen.getByRole('button', { name: 'Enviar invitación' }),
        );

        await screen.findByText('Ese correo ya fue invitado.');
    });

    it('shows a generic mutation error message at the top of the form', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(serverError());
        renderMemberInviteForm();

        await fillInviteForm();
        fireEvent.click(
            screen.getByRole('button', { name: 'Enviar invitación' }),
        );

        await screen.findByText(
            'Ocurrió un error inesperado. Intentá nuevamente.',
        );
    });

    it('renders the Cancelar action as a link to /profesionales', async () => {
        renderMemberInviteForm();

        // Button is composed with a Link (render={<Link ... />}), so it renders as an <a> carrying role="button", not role="link".
        const link = await screen.findByRole('button', { name: 'Cancelar' });
        expect(link.getAttribute('href')).toBe('/profesionales');
    });
});
