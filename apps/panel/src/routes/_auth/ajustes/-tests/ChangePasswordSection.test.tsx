import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePasswordSection } from '../-components/ChangePasswordSection';

vi.mock('@/lib/api', () => ({ api: { put: vi.fn() } }));
vi.mock('@/lib/toast', () => ({ notifySuccess: vi.fn() }));

const NEW_PASSWORD = 'una-clave-nueva-y-larga';

function renderSection() {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <ChangePasswordSection />
        </QueryClientProvider>,
    );
}

function fill(current: string, password: string, confirmation = password) {
    fireEvent.change(screen.getByLabelText('Contraseña actual'), {
        target: { value: current },
    });
    fireEvent.change(screen.getByLabelText('Contraseña nueva'), {
        target: { value: password },
    });
    fireEvent.change(screen.getByLabelText('Repetí la contraseña nueva'), {
        target: { value: confirmation },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
}

beforeEach(() => {
    vi.mocked(api.put).mockReset();
    vi.mocked(notifySuccess).mockClear();
});

describe('ChangePasswordSection', () => {
    it('changes the password with the current one, then clears the form', async () => {
        vi.mocked(api.put).mockResolvedValue({ status: 204, data: '' });
        renderSection();

        fill('password', NEW_PASSWORD);

        await waitFor(() =>
            expect(notifySuccess).toHaveBeenCalledWith(
                'Cambiaste tu contraseña. Cerramos tus otras sesiones abiertas.',
            ),
        );
        expect(api.put).toHaveBeenCalledWith('/me/password', {
            current_password: 'password',
            password: NEW_PASSWORD,
            password_confirmation: NEW_PASSWORD,
        });
        expect(
            (screen.getByLabelText('Contraseña actual') as HTMLInputElement)
                .value,
        ).toBe('');
    });

    it('puts a wrong current password on its field', async () => {
        const message = 'La contraseña actual no es correcta.';
        vi.mocked(api.put).mockRejectedValue({
            isAxiosError: true,
            response: {
                status: 422,
                data: { message, errors: { current_password: [message] } },
            },
        });
        renderSection();

        fill('no-es-esta', NEW_PASSWORD);

        expect(await screen.findByText(message)).not.toBeNull();
        expect(notifySuccess).not.toHaveBeenCalled();
    });

    it('asks for 12 characters before sending', async () => {
        renderSection();

        expect(screen.getByText('Mínimo 12 caracteres.')).not.toBeNull();
        fill('password', 'clave-corta');

        expect(
            await screen.findByText(
                'La contraseña debe tener al menos 12 caracteres.',
            ),
        ).not.toBeNull();
        expect(api.put).not.toHaveBeenCalled();
    });
});
