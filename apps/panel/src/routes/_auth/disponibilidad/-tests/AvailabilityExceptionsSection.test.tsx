import { api } from '@/lib/api';
import type { AvailabilityException } from '@/types/availability';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilityExceptionsSection } from '../-components/AvailabilityExceptionsSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const EXCEPTION: AvailabilityException = {
    id: 12,
    membership_id: 3,
    type: 'blocked',
    start_at: '2026-08-03T10:00:00',
    end_at: '2026-08-03T12:00:00',
    reason: null,
};

function renderSection() {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <AvailabilityExceptionsSection
                membershipId={3}
                canManageOwn
                canManageOrgWide={false}
            />
        </QueryClientProvider>,
    );
}

describe('AvailabilityExceptionsSection', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.delete).mockReset();
    });

    it('requires confirmation before deleting an exception', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            data: { data: [EXCEPTION] },
        });
        vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });
        renderSection();

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
    });
});
