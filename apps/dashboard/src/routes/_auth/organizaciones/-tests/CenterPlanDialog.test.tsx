import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import { renderRoute } from '@/tests/render-route';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CenterPlanDialog } from '../-components/CenterPlanDialog';

const refresh = vi.fn(() => Promise.resolve());

vi.mock('@/lib/api', () => ({ api: { put: vi.fn() } }));
vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));
vi.mock('@/hooks/use-refresh-page-data', () => ({
    useRefreshPageData: () => refresh,
}));

async function openDialog(assigned: boolean, name: string) {
    await renderRoute(
        <CenterPlanDialog organizationId={7} assigned={assigned} />,
        { path: '/organizaciones/7' },
    );
    fireEvent.click(screen.getByRole('button', { name }));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('Motivo'), {
        target: { value: 'Contrato firmado' },
    });
    fireEvent.click(screen.getAllByRole('button', { name }).at(-1)!);
}

describe('CenterPlanDialog', () => {
    it('assigns Centro with the reason, toasts and refreshes every moderation read', async () => {
        vi.mocked(api.put).mockResolvedValueOnce({ data: { data: {} } });

        await openDialog(false, 'Asignar plan Centro');

        await waitFor(() =>
            expect(api.put).toHaveBeenCalledWith(
                '/admin/organizations/7/plan',
                {
                    assigned_plan: 'center',
                    reason: 'Contrato firmado',
                },
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
        expect(notifySuccess).toHaveBeenCalledWith('Plan Centro asignado');
    });

    it('removes Centro by sending a null plan', async () => {
        vi.mocked(api.put).mockResolvedValueOnce({ data: { data: {} } });

        await openDialog(true, 'Quitar plan Centro');

        await waitFor(() =>
            expect(api.put).toHaveBeenCalledWith(
                '/admin/organizations/7/plan',
                {
                    assigned_plan: null,
                    reason: 'Contrato firmado',
                },
            ),
        );
        expect(notifySuccess).toHaveBeenCalledWith('Plan Centro quitado');
    });

    it('shows the 409 copy in the form while the subscription can still charge', async () => {
        vi.mocked(api.put).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'plans.subscription_live',
                        message:
                            'The organization still has a subscription that can charge.',
                        context: { subscription_status: 'active' },
                    },
                },
            },
        });

        await openDialog(false, 'Asignar plan Centro');

        await screen.findByText(
            'La organización tiene una suscripción de Mercado Pago que todavía puede cobrar. La persona dueña tiene que cancelarla antes de pasar a Centro.',
        );
        expect(screen.getByRole('dialog')).not.toBeNull();
    });
});
