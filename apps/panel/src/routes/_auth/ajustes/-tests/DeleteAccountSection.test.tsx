import { api } from '@/lib/api';
import { setPracticeTimeZone } from '@/lib/datetime';
import { sessionQueryOptions } from '@/lib/session';
import { notifySuccess } from '@/lib/toast';
import { stubElementFromPoint } from '@/tests/input-otp';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteAccountSection } from '../-components/DeleteAccountSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

const navigate = vi.fn();
const invalidate = vi.fn(() => Promise.resolve());
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return {
        ...actual,
        useNavigate: () => navigate,
        useRouter: () => ({ invalidate }),
    };
});

function businessError(code: string, organizations: string[]) {
    return {
        isAxiosError: true,
        response: {
            status: 409,
            data: {
                error: {
                    code,
                    message: 'Refused.',
                    context: {
                        organizations: organizations.map((name, index) => ({
                            id: index + 1,
                            name,
                        })),
                    },
                },
            },
        },
    };
}

function renderSection(twoFactorEnabled = false) {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['session'], { id: 1 });
    render(
        <QueryClientProvider client={queryClient}>
            <DeleteAccountSection twoFactorEnabled={twoFactorEnabled} />
        </QueryClientProvider>,
    );

    return queryClient;
}

async function openDialog() {
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar cuenta' }));
    fireEvent.change(await screen.findByLabelText('Contraseña'), {
        target: { value: 'secreta123' },
    });
}

function confirm() {
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar mi cuenta' }));
}

stubElementFromPoint();

describe('DeleteAccountSection', () => {
    beforeEach(() => {
        setPracticeTimeZone('America/Argentina/Buenos_Aires');
        vi.mocked(api.post).mockReset();
        vi.mocked(notifySuccess).mockReset();
        navigate.mockReset();
        invalidate.mockClear();
    });

    it("says what goes, what stays and how long there is to change one's mind", () => {
        renderSection();

        screen.getByText(/Tu cuenta se elimina a los 7 días/);
        screen.getByText(/se conserva con tu nombre/);
        screen.getByText(/tenés turnos por atender, resolvelo antes/);
        expect(
            screen
                .getByRole<HTMLButtonElement>('button', {
                    name: 'Eliminar cuenta',
                })
                .hasAttribute('disabled'),
        ).toBe(false);
    });

    it('asks only for the password, then leaves for the login with the date', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { data: { deletes_at: '2026-11-09T15:00:00+00:00' } },
        });
        const queryClient = renderSection();

        await openDialog();
        expect(screen.queryByLabelText('Código de verificación')).toBeNull();
        confirm();

        await waitFor(() =>
            expect(navigate).toHaveBeenCalledWith({ to: '/login' }),
        );
        expect(api.post).toHaveBeenCalledWith('/me/account-deletion', {
            password: 'secreta123',
        });
        expect(notifySuccess).toHaveBeenCalledWith(
            'Vamos a eliminar tu cuenta el 9 nov 2026. Si cambiás de idea, ingresá antes de esa fecha.',
        );
        expect(queryClient.getQueryData(['session'])).toBeUndefined();
    });

    it('with the second factor on, sends the app code, or a recovery code', async () => {
        vi.mocked(api.post).mockResolvedValue({
            data: { data: { deletes_at: '2026-11-09T15:00:00+00:00' } },
        });
        renderSection(true);

        await openDialog();
        fireEvent.change(screen.getByLabelText('Código de verificación'), {
            target: { value: '123456' },
        });
        confirm();

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/me/account-deletion', {
                password: 'secreta123',
                code: '123456',
            }),
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Usar un código de recuperación',
            }),
        );
        fireEvent.change(screen.getByLabelText('Código de recuperación'), {
            target: { value: 'abcde-fghjk' },
        });
        confirm();

        await waitFor(() =>
            expect(api.post).toHaveBeenLastCalledWith('/me/account-deletion', {
                password: 'secreta123',
                recovery_code: 'abcde-fghjk',
            }),
        );
    });

    it("with the second factor on, doesn't send without a code", async () => {
        renderSection(true);

        await openDialog();
        confirm();

        await screen.findByText('El código tiene 6 números.');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('shows a wrong password on its field and stays', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 422,
                data: {
                    message: 'La contraseña no es correcta.',
                    errors: { password: ['La contraseña no es correcta.'] },
                },
            },
        });
        renderSection();

        await openDialog();
        confirm();

        await screen.findByText('La contraseña no es correcta.');
        expect(navigate).not.toHaveBeenCalled();
    });

    it('when the factor was turned on since the page loaded, says the code is missing and reloads the session', async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: { id: 1, two_factor_enabled: true },
        });
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 422,
                data: {
                    message: 'Ingresá el código de tu app de autenticación.',
                    errors: {
                        code: ['Ingresá el código de tu app de autenticación.'],
                    },
                },
            },
        });
        const queryClient = renderSection(false);
        // As the route's loader leaves it.
        await queryClient.fetchQuery({ ...sessionQueryOptions, staleTime: 0 });

        await openDialog();
        confirm();

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain(
            'Ingresá el código de tu app de autenticación.',
        );
        await waitFor(() => expect(invalidate).toHaveBeenCalled());
    });

    it('gives focus back to the button that opened it when cancelled', async () => {
        renderSection();

        const trigger = screen.getByRole('button', { name: 'Eliminar cuenta' });
        trigger.focus();
        await openDialog();
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        await waitFor(() => expect(document.activeElement).toBe(trigger));
    });

    it.each([
        [
            'account.deletion_last_active_admin',
            'Antes de eliminar tu cuenta, sumá a otra persona como dueña o administradora donde sos la única.',
        ],
        [
            'account.deletion_future_appointments',
            'Antes de eliminar tu cuenta, reasigná o cancelá los turnos que tenés por atender.',
        ],
    ])('on %s, says what to resolve and where', async (code, message) => {
        vi.mocked(api.post).mockRejectedValueOnce(
            businessError(code, ['Consultorio Norte', 'Consultorio Sur']),
        );
        renderSection();

        await openDialog();
        confirm();

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain(message);
        expect(
            Array.from(alert.querySelectorAll('li')).map(
                (item) => item.textContent,
            ),
        ).toEqual(['Consultorio Norte', 'Consultorio Sur']);
        expect(navigate).not.toHaveBeenCalled();
    });
});
