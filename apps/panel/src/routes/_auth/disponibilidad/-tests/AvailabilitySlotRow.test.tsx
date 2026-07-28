import { api } from '@/lib/api';
import type { Availability } from '@/types/availability';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilitySlotRow } from '../-components/AvailabilitySlotRow';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const SLOT: Availability = {
    id: 7,
    membership_id: 3,
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
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
    });
});
