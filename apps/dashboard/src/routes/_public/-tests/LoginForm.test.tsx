import { api, refreshCsrfCookie } from '@/lib/api';
import { adminSessionQueryOptions } from '@/lib/session';
import { renderRoute } from '@/tests/render-route';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../-components/LoginForm';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
    refreshCsrfCookie: vi.fn(() => Promise.resolve({ data: '' })),
}));

const ADMIN = {
    id: 1,
    name: 'Olivia Operadora',
    email: 'operador@test.com',
    last_login_at: '2026-10-04T15:00:00+00:00',
};

function axiosError(status: number, data: unknown = {}) {
    return { isAxiosError: true, response: { status, data } };
}

function renderLoginForm(redirectTo?: string) {
    return renderRoute(<LoginForm redirectTo={redirectTo} />, {
        path: '/login',
        linkTargets: ['/', '/organizaciones/$id'],
    });
}

async function submitCredentials(password = 'password') {
    fireEvent.change(await screen.findByLabelText('Correo electrónico'), {
        target: { value: 'operador@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
        target: { value: password },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('LoginForm (dashboard)', () => {
    it('validates both fields client-side and sends nothing when empty', async () => {
        await renderLoginForm();

        fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

        await screen.findByText('El correo es obligatorio.');
        screen.getByText('La contraseña es obligatoria.');
        expect(refreshCsrfCookie).not.toHaveBeenCalled();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('warms up the CSRF cookie, then posts to /admin/login', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: { data: ADMIN } });
        await renderLoginForm();

        await submitCredentials();

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/admin/login', {
                email: 'operador@test.com',
                password: 'password',
            }),
        );
        expect(
            vi.mocked(refreshCsrfCookie).mock.invocationCallOrder[0],
        ).toBeLessThan(vi.mocked(api.post).mock.invocationCallOrder[0]);
    });

    it('shows Spanish copy for the message-only 422, never the English server message', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            axiosError(422, { message: 'Invalid credentials.' }),
        );
        await renderLoginForm();

        await submitCredentials('incorrecta');

        await screen.findByText('Correo o contraseña incorrectos.');
        expect(screen.queryByText('Invalid credentials.')).toBeNull();
    });

    it('keeps per-field 422 errors on their fields', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            axiosError(422, {
                message: 'The email field must be a valid email address.',
                errors: { email: ['El correo no es válido.'] },
            }),
        );
        await renderLoginForm();

        await submitCredentials();

        await screen.findByText('El correo no es válido.');
        expect(
            screen.queryByText('Correo o contraseña incorrectos.'),
        ).toBeNull();
    });

    it('shows the rate-limited copy on a 429', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            axiosError(429, { message: 'Too Many Attempts.' }),
        );
        await renderLoginForm();

        await submitCredentials();

        await screen.findByText(
            'Hiciste demasiados intentos. Esperá un momento y volvé a intentar.',
        );
    });

    it('caches the unwrapped operator and navigates to the overview on success', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: { data: ADMIN } });
        const { queryClient, router } = await renderLoginForm();

        await submitCredentials();

        await screen.findByText('Página /');
        expect(router.state.location.pathname).toBe('/');
        expect(
            queryClient.getQueryData(adminSessionQueryOptions.queryKey),
        ).toEqual(ADMIN);
    });

    it('goes back to a safe redirect target after logging in', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: { data: ADMIN } });
        const { router } = await renderLoginForm('/organizaciones/12');

        await submitCredentials();

        await screen.findByText('Página /organizaciones/$id');
        expect(router.state.location.href).toBe('/organizaciones/12');
    });
});
