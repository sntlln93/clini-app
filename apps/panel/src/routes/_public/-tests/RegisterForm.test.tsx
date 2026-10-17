import { api } from '@/lib/api';
import { browserTimeZone } from '@/lib/datetime';
import { navigateToExternalUrl } from '@/lib/external-navigation';
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
import type { RegisterPlan } from '../-components/RegisterPlanField';

vi.mock('@/lib/datetime', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/datetime')>()),
    browserTimeZone: vi.fn(),
}));

vi.mock('@/lib/external-navigation', () => ({
    navigateToExternalUrl: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const STUB_TIMEZONE = 'America/Argentina/Buenos_Aires';

function unauthorizedError(data: unknown) {
    return { isAxiosError: true, response: { status: 422, data } };
}

function renderRegisterForm(plan?: RegisterPlan) {
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
        component: () => <RegisterForm plan={plan} />,
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
    const ajustesRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/ajustes',
        component: () => <div>Ajustes</div>,
    });
    const routeTree = rootRoute.addChildren([
        registerRoute,
        loginRoute,
        agendaRoute,
        ajustesRoute,
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
        vi.mocked(browserTimeZone).mockReturnValue(STUB_TIMEZONE);
        vi.mocked(api.post).mockReset();
        vi.mocked(api.get).mockReset();
        vi.mocked(navigateToExternalUrl).mockReset();
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

    it('does not ask whether the owner attends patients (#286)', async () => {
        renderRegisterForm();
        await screen.findByLabelText('Nombre');

        expect(screen.queryByRole('checkbox')).toBeNull();
        expect(screen.queryByText(/atiendo pacientes/i)).toBeNull();
    });

    it('preselects Gratis, or the plan the landing linked with (#286)', async () => {
        renderRegisterForm();

        expect(
            (await screen.findByRole('radio', { name: /Gratis/ })).getAttribute(
                'aria-checked',
            ),
        ).toBe('true');
    });

    it('preselects Consultorio when the landing linked with it', async () => {
        renderRegisterForm('consultorio');

        expect(
            (
                await screen.findByRole('radio', { name: /Consultorio/ })
            ).getAttribute('aria-checked'),
        ).toBe('true');
    });

    it('on Gratis goes to the agenda and starts no checkout', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { id: 1, name: 'Ana Ejemplo', email: 'ana@clini.app' },
        });
        renderRegisterForm();
        await fillForm();

        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        await screen.findByText('Agenda');
        expect(api.post).toHaveBeenCalledTimes(1);
        expect(navigateToExternalUrl).not.toHaveBeenCalled();
    });

    it('on Consultorio registers without the plan, then sends the browser to the checkout', async () => {
        vi.mocked(api.post)
            .mockResolvedValueOnce({
                data: { id: 1, name: 'Ana Ejemplo', email: 'ana@clini.app' },
            })
            .mockResolvedValueOnce({
                data: { data: { init_point: 'https://mp.example/checkout' } },
            });
        renderRegisterForm();
        await fillForm();
        fireEvent.click(
            await screen.findByRole('radio', { name: /Consultorio/ }),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        await waitFor(() =>
            expect(navigateToExternalUrl).toHaveBeenCalledWith(
                'https://mp.example/checkout',
            ),
        );
        expect(api.post).toHaveBeenNthCalledWith(
            1,
            '/register',
            expect.not.objectContaining({ plan: expect.anything() }),
        );
        expect(api.post).toHaveBeenNthCalledWith(2, '/subscription');
        // The account already exists: a second submit could only fail.
        const button = await screen.findByRole('button', {
            name: 'Yendo a Mercado Pago…',
        });
        expect(button.hasAttribute('disabled')).toBe(true);
        expect(screen.queryByText('Agenda')).toBeNull();
    });

    it('sends a Consultorio account whose checkout fails to start to Ajustes, to retry it', async () => {
        vi.mocked(api.post)
            .mockResolvedValueOnce({
                data: { id: 1, name: 'Ana Ejemplo', email: 'ana@clini.app' },
            })
            .mockRejectedValueOnce(new Error('network'));
        renderRegisterForm('consultorio');
        await fillForm();

        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        await screen.findByText('Ajustes');
        expect(navigateToExternalUrl).not.toHaveBeenCalled();
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

    it('shows the 8-character rule upfront and blocks a shorter password before submitting', async () => {
        renderRegisterForm();

        await fillForm();
        expect(screen.getByText('Mínimo 8 caracteres.')).not.toBeNull();
        fireEvent.change(screen.getByLabelText('Contraseña'), {
            target: { value: 'corta' },
        });
        fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
            target: { value: 'corta' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        await screen.findByText(
            'La contraseña debe tener al menos 8 caracteres.',
        );
        expect(api.post).not.toHaveBeenCalled();
    });

    it('asks to confirm the password when the confirmation is empty', async () => {
        renderRegisterForm();

        await fillForm();
        fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
            target: { value: '' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

        await screen.findByText('Confirmá tu contraseña.');
        expect(api.post).not.toHaveBeenCalled();
    });
});
