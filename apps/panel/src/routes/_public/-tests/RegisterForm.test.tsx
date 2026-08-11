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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterForm } from '../-components/RegisterForm';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const STUB_TIMEZONE = 'America/Argentina/Buenos_Aires';

function unauthorizedError(data: unknown) {
    return { isAxiosError: true, response: { status: 422, data } };
}

function renderRegisterForm() {
    const queryClient = new QueryClient();
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    const registerRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/registro',
        component: RegisterForm,
    });
    const loginRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/login',
        component: () => <div>Login</div>,
    });
    const agendaRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/agenda',
        component: () => <div>Agenda</div>,
    });
    const routeTree = rootRoute.addChildren([
        registerRoute,
        loginRoute,
        agendaRoute,
    ]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: ['/registro'] }),
    });
    render(<RouterProvider router={router} />);

    return queryClient;
}

async function fillForm() {
    fireEvent.change(await screen.findByLabelText('Nombre'), {
        target: { value: 'Ana Ejemplo' },
    });
    fireEvent.change(screen.getByLabelText('Nombre del consultorio'), {
        target: { value: 'Consultorio Ana' },
    });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
        target: { value: 'ana@clini.app' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
        target: { value: 'secreta123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'secreta123' },
    });
}

describe('RegisterForm', () => {
    beforeEach(() => {
        vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
            resolvedOptions: () => ({ timeZone: STUB_TIMEZONE }),
        } as unknown as Intl.DateTimeFormat);
    });

    it('sends the form fields plus the auto-detected timezone, and renders no timezone input', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { id: 1, name: 'Ana Ejemplo', email: 'ana@clini.app' },
        });
        renderRegisterForm();
        await fillForm();

        expect(screen.queryByLabelText(/zona horaria|timezone/i)).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/register', {
                name: 'Ana Ejemplo',
                email: 'ana@clini.app',
                organization_name: 'Consultorio Ana',
                password: 'secreta123',
                password_confirmation: 'secreta123',
                timezone: STUB_TIMEZONE,
            }),
        );
    });

    it('renders per-field errors from a 422 and keeps the typed values', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            unauthorizedError({
                message: 'Los datos ingresados no son válidos.',
                errors: {
                    name: ['El nombre es obligatorio.'],
                    email: ['El correo ya está registrado.'],
                },
            }),
        );
        renderRegisterForm();

        await fillForm();
        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        await screen.findByText('El nombre es obligatorio.');
        screen.getByText('El correo ya está registrado.');
        expect(
            (screen.getByLabelText('Nombre') as HTMLInputElement).value,
        ).toBe('Ana Ejemplo');
        expect(
            (screen.getByLabelText('Correo electrónico') as HTMLInputElement)
                .value,
        ).toBe('ana@clini.app');
    });

    it('navigates to /agenda on successful registration', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { id: 1, name: 'Ana Ejemplo', email: 'ana@clini.app' },
        });
        renderRegisterForm();

        await fillForm();
        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        await screen.findByText('Agenda');
    });

    it('caches the full session payload from the register response, with no further fetch', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: {
                id: 1,
                name: 'Ana Ejemplo',
                email: 'ana@clini.app',
                organization: { id: 1, name: 'Consultorio Ana' },
                roles: ['owner'],
                permissions: ['memberships.view'],
            },
        });
        const queryClient = renderRegisterForm();

        await fillForm();
        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        await screen.findByText('Agenda');

        expect(api.get).not.toHaveBeenCalled();
        expect(
            queryClient.getQueryData(sessionQueryOptions.queryKey),
        ).toMatchObject({ permissions: ['memberships.view'] });
    });

    it('shows an inline message when the password confirmation does not match, and does not call POST /register', async () => {
        renderRegisterForm();

        await fillForm();
        fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
            target: { value: 'otra-contraseña' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        await screen.findByText('Las contraseñas no coinciden.');
        expect(api.post).not.toHaveBeenCalled();
    });
});
