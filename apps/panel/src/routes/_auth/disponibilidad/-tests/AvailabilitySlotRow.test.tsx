import { api } from '@/lib/api';
import type { Availability } from '@/types/availability';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilitySlotRow } from '../-components/AvailabilitySlotRow';
import { mergeSlotDescription } from '../-components/availability-merge';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const invalidate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

const SLOT: Availability = {
    id: 7,
    membership_id: 3,
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
};

function businessAxiosError(code: string, context: Record<string, unknown>) {
    return {
        isAxiosError: true,
        response: {
            status: 409,
            data: { error: { code, message: 'x', context } },
        },
    };
}

const MERGE_PROPOSAL = {
    merged: { start: '09:00', end: '11:00' },
    absorbed: [{ start: '10:00', end: '11:00' }],
};

function renderRow() {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <AvailabilitySlotRow
                membershipId={3}
                dayOfWeek={1}
                slot={SLOT}
                canManage
            />
        </QueryClientProvider>,
    );
}

describe('AvailabilitySlotRow', () => {
    beforeEach(() => {
        vi.mocked(api.patch).mockReset();
        vi.mocked(api.delete).mockReset();
        invalidate.mockReset();
    });

    it('requires confirmation before deleting a slot', async () => {
        vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });
        renderRow();

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

        expect(api.delete).not.toHaveBeenCalled();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Confirmar' }),
        );

        await waitFor(() =>
            expect(api.delete).toHaveBeenCalledWith('/availabilities/7'),
        );
        await waitFor(() => expect(invalidate).toHaveBeenCalled());
    });

    it('opens the merge dialog on a 409 slot_merge_required and sends no second request yet', async () => {
        vi.mocked(api.patch).mockRejectedValueOnce(
            businessAxiosError(
                'availability.slot_merge_required',
                MERGE_PROPOSAL,
            ),
        );
        renderRow();

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await screen.findByText(mergeSlotDescription(MERGE_PROPOSAL));
        expect(api.patch).toHaveBeenCalledTimes(1);
    });

    it('re-sends the same values with merge: true when the merge dialog is confirmed', async () => {
        vi.mocked(api.patch)
            .mockRejectedValueOnce(
                businessAxiosError(
                    'availability.slot_merge_required',
                    MERGE_PROPOSAL,
                ),
            )
            .mockResolvedValueOnce({ data: {} });
        renderRow();

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
        await screen.findByText(mergeSlotDescription(MERGE_PROPOSAL));

        fireEvent.click(screen.getByRole('button', { name: 'Combinar' }));

        await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));
        expect(api.patch).toHaveBeenNthCalledWith(2, '/availabilities/7', {
            day_of_week: 1,
            start_time: '09:00',
            end_time: '10:00',
            merge: true,
        });
    });

    it('closes the merge dialog and sends no further request when cancelled', async () => {
        vi.mocked(api.patch).mockRejectedValueOnce(
            businessAxiosError(
                'availability.slot_merge_required',
                MERGE_PROPOSAL,
            ),
        );
        renderRow();

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
        await screen.findByText(mergeSlotDescription(MERGE_PROPOSAL));

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        await waitFor(() =>
            expect(
                screen.queryByText(mergeSlotDescription(MERGE_PROPOSAL)),
            ).toBeNull(),
        );
        expect(api.patch).toHaveBeenCalledTimes(1);
    });

    it('does not open the merge dialog for a different 409 code', async () => {
        vi.mocked(api.patch).mockRejectedValueOnce(
            businessAxiosError('availability.slot_already_covered', {}),
        );
        renderRow();

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await screen.findByText(
            'Ese horario ya está incluido en otro que cargaste para ese día. No hace falta agregarlo.',
        );
        expect(
            screen.queryByText(mergeSlotDescription(MERGE_PROPOSAL)),
        ).toBeNull();
        expect(api.patch).toHaveBeenCalledTimes(1);
    });
});
