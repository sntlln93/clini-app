import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import { renderRoute } from '@/tests/render-route';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SuspendOrganizationDialog } from '../-components/SuspendOrganizationDialog';

const refresh = vi.fn(() => Promise.resolve());

vi.mock('@/lib/api', () => ({ api: { post: vi.fn() } }));
vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));
vi.mock('@/hooks/use-refresh-page-data', () => ({
    useRefreshPageData: () => refresh,
}));

async function openDialog() {
    await renderRoute(<SuspendOrganizationDialog organizationId={7} />, {
        path: '/organizaciones/7',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Suspender' }));
    await screen.findByRole('dialog');
}

function submit() {
    fireEvent.click(
        screen.getAllByRole('button', { name: 'Suspender' }).at(-1)!,
    );
}

describe('SuspendOrganizationDialog', () => {
    it('explains the consequences and requires a reason', async () => {
        await openDialog();

        screen.getByText(
            'Sus miembros no podrán usar el panel y la reserva online quedará deshabilitada.',
        );
        submit();

        await screen.findByText('Escribí un motivo de al menos 3 caracteres.');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('submits the reason, toasts and refreshes every read that shows the suspension', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: { data: {} } });
        await openDialog();

        fireEvent.change(screen.getByLabelText('Motivo'), {
            target: { value: 'Uso fraudulento' },
        });
        submit();

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/admin/organizations/7/suspension',
                { reason: 'Uso fraudulento' },
            ),
        );
        await waitFor(() =>
            expect(refresh).toHaveBeenCalledWith(
                ['organizations'],
                ['users'],
                ['subscriptions'],
                ['audit-logs'],
                ['overview'],
            ),
        );
        expect(notifySuccess).toHaveBeenCalledWith('Organización suspendida');
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('shows the 409 copy in the form when it was already suspended', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'organizations.already_suspended',
                        message: 'Organization is already suspended.',
                        context: {},
                    },
                },
            },
        });
        await openDialog();

        fireEvent.change(screen.getByLabelText('Motivo'), {
            target: { value: 'Uso fraudulento' },
        });
        submit();

        await screen.findByText(
            'La organización ya estaba suspendida. Actualizá la página para ver su estado actual.',
        );
        expect(screen.getByRole('dialog')).not.toBeNull();
    });
});
