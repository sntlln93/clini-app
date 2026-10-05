import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import { renderRoute } from '@/tests/render-route';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BlockUserDialog } from '../-components/BlockUserDialog';

const refresh = vi.fn(() => Promise.resolve());

vi.mock('@/lib/api', () => ({ api: { post: vi.fn() } }));
vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));
vi.mock('@/hooks/use-refresh-page-data', () => ({
    useRefreshPageData: () => refresh,
}));

async function openAndFill(reason: string) {
    await renderRoute(<BlockUserDialog userId={4} />, { path: '/usuarios/4' });
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear' }));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('Motivo'), {
        target: { value: reason },
    });
    fireEvent.click(
        screen.getAllByRole('button', { name: 'Bloquear' }).at(-1)!,
    );
}

describe('BlockUserDialog', () => {
    it('rejects a reason shorter than 3 characters', async () => {
        await openAndFill('no');

        await screen.findByText('Escribí un motivo de al menos 3 caracteres.');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('blocks with the reason and refreshes every read that shows the user', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: { data: {} } });
        await openAndFill('Spam reiterado');

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith('/admin/users/4/block', {
                reason: 'Spam reiterado',
            }),
        );
        await waitFor(() =>
            expect(refresh).toHaveBeenCalledWith(
                ['users'],
                ['organizations'],
                ['audit-logs'],
                ['overview'],
            ),
        );
        expect(notifySuccess).toHaveBeenCalledWith('Usuario bloqueado');
    });

    it('shows the 409 copy when the user was already blocked', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'users.already_blocked',
                        message: 'x',
                        context: {},
                    },
                },
            },
        });
        await openAndFill('Spam reiterado');

        await screen.findByText(
            'El usuario ya estaba bloqueado. Actualizá la página para ver su estado actual.',
        );
    });
});
