import { api } from '@/lib/api';
import type { AvailabilityException } from '@/types/availability';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilityExceptionsSection } from '../-components/AvailabilityExceptionsSection';
import type { AvailabilityReadOnlyReason } from '../-hooks/use-availability-permissions';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const invalidate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

const EXCEPTION: AvailabilityException = {
    id: 12,
    membership_id: 3,
    type: 'blocked',
    start_at: '2026-08-03T10:00:00',
    end_at: '2026-08-03T12:00:00',
    reason: null,
};

function renderSection(
    exceptions: AvailabilityException[],
    readOnlyReason: AvailabilityReadOnlyReason | null = null,
) {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <AvailabilityExceptionsSection
                membershipId={3}
                canManageOwn={readOnlyReason === null}
                canManageOrgWide={false}
                readOnlyReason={readOnlyReason}
                exceptions={exceptions}
            />
        </QueryClientProvider>,
    );
}

describe('AvailabilityExceptionsSection', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.delete).mockReset();
        invalidate.mockReset();
    });

    it('requires confirmation before deleting an exception', async () => {
        vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });
        renderSection([EXCEPTION]);

        fireEvent.click(
            await screen.findByRole('button', { name: 'Eliminar' }),
        );

        expect(api.delete).not.toHaveBeenCalled();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Confirmar' }),
        );

        await waitFor(() =>
            expect(api.delete).toHaveBeenCalledWith(
                '/availability-exceptions/12',
            ),
        );
        await waitFor(() => expect(invalidate).toHaveBeenCalled());
    });

    it('shows the range in local es-AR time instead of the raw ISO strings', () => {
        renderSection([
            {
                ...EXCEPTION,
                start_at: '2099-10-12T12:00:00.000000Z',
                end_at: '2099-10-12T16:00:00.000000Z',
            },
        ]);

        screen.getByText('lun 12 oct, 09:00 – 13:00');
        expect(screen.queryByText(/2099-10-12T/)).toBeNull();
        expect(screen.queryByText('Finalizada')).toBeNull();
    });

    it('labels an exception that already ended as «Finalizada»', () => {
        renderSection([
            {
                ...EXCEPTION,
                start_at: '2020-03-02T12:00:00Z',
                end_at: '2020-03-02T16:00:00Z',
            },
        ]);

        screen.getByText('Finalizada');
    });

    it('explains why the section is read-only', () => {
        renderSection([EXCEPTION], 'permission');

        screen.getByText(/no tenés permiso para editar la disponibilidad/);
        expect(
            screen.queryByRole('button', { name: 'Agregar excepción' }),
        ).toBeNull();
    });
});
