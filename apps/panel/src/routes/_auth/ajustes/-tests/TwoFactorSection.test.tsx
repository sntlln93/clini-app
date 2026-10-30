import { api } from '@/lib/api';
import { saveFile } from '@/lib/download';
import { notifySuccess } from '@/lib/toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TwoFactorSection } from '../-components/TwoFactorSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

vi.mock('@/lib/download', () => ({ saveFile: vi.fn() }));

const invalidate = vi.fn(() => Promise.resolve());
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

const SETUP = {
    secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
    provisioning_uri: 'otpauth://totp/Clini:ana%40clini.app?secret=JBSWY3DP',
    qr_code_svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
};

const CODES = ['abcde-fghjk', 'mnpqr-stuvw'];

function passwordError() {
    return {
        isAxiosError: true,
        response: {
            status: 422,
            data: {
                message: 'La contraseña no es correcta.',
                errors: { password: ['La contraseña no es correcta.'] },
            },
        },
    };
}

function renderSection(enabled: boolean) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <TwoFactorSection enabled={enabled} />
        </QueryClientProvider>,
    );
}

async function confirmPassword(submitLabel: string) {
    fireEvent.change(await screen.findByLabelText('Contraseña'), {
        target: { value: 'secreta123' },
    });
    fireEvent.click(screen.getByRole('button', { name: submitLabel }));
}

describe('TwoFactorSection', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(api.delete).mockReset();
        vi.mocked(notifySuccess).mockReset();
        vi.mocked(saveFile).mockReset();
        invalidate.mockClear();
    });

    it('shows the factor off with a button to turn it on', () => {
        renderSection(false);

        screen.getByText('Desactivada');
        screen.getByRole('button', { name: 'Activar' });
        expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull();
    });

    it('turns the factor on: password, QR code and its first code, then the recovery codes', async () => {
        renderSection(false);
        fireEvent.click(screen.getByRole('button', { name: 'Activar' }));

        vi.mocked(api.post).mockResolvedValueOnce({ data: { data: SETUP } });
        await confirmPassword('Continuar');

        await screen.findByAltText(
            'Código QR para agregar la cuenta a tu app de autenticación',
        );
        screen.getByText(SETUP.secret);
        expect(api.post).toHaveBeenLastCalledWith('/me/two-factor', {
            password: 'secreta123',
        });

        vi.mocked(api.post).mockResolvedValueOnce({
            data: { data: { recovery_codes: CODES } },
        });
        fireEvent.change(screen.getByLabelText('Código de verificación'), {
            target: { value: '123456' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Activar' }));

        const list = await screen.findByRole('list', {
            name: 'Códigos de recuperación',
        });
        expect(list.textContent).toContain('abcde-fghjk');
        expect(api.post).toHaveBeenLastCalledWith(
            '/me/two-factor/confirmation',
            { code: '123456' },
        );
        // The session is refreshed so the page shows the factor on.
        await waitFor(() => expect(invalidate).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));
        expect(saveFile).toHaveBeenCalledWith(
            expect.any(Blob),
            'codigos-de-recuperacion.txt',
        );
    });

    it('starts over at the password when reopened after being closed with a request in flight', async () => {
        renderSection(false);
        fireEvent.click(screen.getByRole('button', { name: 'Activar' }));

        let answer: (value: unknown) => void = () => {};
        vi.mocked(api.post).mockReturnValueOnce(
            new Promise((resolve) => {
                answer = resolve;
            }),
        );
        await confirmPassword('Continuar');
        await waitFor(() => expect(api.post).toHaveBeenCalled());
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

        answer({ data: { data: SETUP } });
        fireEvent.click(screen.getByRole('button', { name: 'Activar' }));

        await screen.findByLabelText('Contraseña');
        expect(
            screen.queryByAltText(
                'Código QR para agregar la cuenta a tu app de autenticación',
            ),
        ).toBeNull();
    });

    it('keeps a wrong password on its field', async () => {
        renderSection(false);
        fireEvent.click(screen.getByRole('button', { name: 'Activar' }));

        vi.mocked(api.post).mockRejectedValueOnce(passwordError());
        await confirmPassword('Continuar');

        await screen.findByText('La contraseña no es correcta.');
        screen.getByLabelText('Contraseña');
    });

    it('shows a rejected setup code on its field', async () => {
        renderSection(false);
        fireEvent.click(screen.getByRole('button', { name: 'Activar' }));
        vi.mocked(api.post).mockResolvedValueOnce({ data: { data: SETUP } });
        await confirmPassword('Continuar');

        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'auth.two_factor_code_invalid',
                        message: 'The two-factor code is invalid.',
                        context: {},
                    },
                },
            },
        });
        fireEvent.change(
            await screen.findByLabelText('Código de verificación'),
            { target: { value: '000000' } },
        );
        fireEvent.click(screen.getByRole('button', { name: 'Activar' }));

        await screen.findByText(
            'El código no es válido o ya se usó. Probá con el código que muestra ahora tu app.',
        );
    });

    it('turns the factor off after the password', async () => {
        renderSection(true);
        screen.getByText('Activada');

        fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
        vi.mocked(api.delete).mockResolvedValueOnce({ data: null });
        await confirmPassword('Desactivar');

        await waitFor(() =>
            expect(api.delete).toHaveBeenCalledWith('/me/two-factor', {
                data: { password: 'secreta123' },
            }),
        );
        await waitFor(() =>
            expect(notifySuccess).toHaveBeenCalledWith(
                'Verificación en dos pasos desactivada',
            ),
        );
        expect(invalidate).toHaveBeenCalled();
    });

    it('shows the new recovery codes after regenerating them', async () => {
        renderSection(true);

        fireEvent.click(
            screen.getByRole('button', { name: 'Generar códigos nuevos' }),
        );
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { data: { recovery_codes: CODES } },
        });
        await confirmPassword('Generar');

        const list = await screen.findByRole('list', {
            name: 'Códigos de recuperación',
        });
        expect(list.textContent).toContain('mnpqr-stuvw');
        expect(api.post).toHaveBeenCalledWith('/me/two-factor/recovery-codes', {
            password: 'secreta123',
        });
    });
});
