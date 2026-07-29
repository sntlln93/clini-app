import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import type {
    ProfessionalSpecialty,
    UserSpecialty,
} from '@/types/professional';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfessionalSpecialtyRow } from '../-components/ProfessionalSpecialtyRow';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const invalidate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

const MEMBERSHIP: Membership = {
    id: 3,
    user: { id: 9, name: 'Ana Gomez', email: 'ana@clini.app' },
    roles: ['professional'],
    status: 'active',
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

const CREDENTIALS: UserSpecialty[] = [
    { id: 5, specialty_id: 1, specialty_name: 'Cardiología' },
];

const ASSIGNED: ProfessionalSpecialty[] = [
    {
        id: 20,
        membership_id: 3,
        specialty_id: 1,
        specialty_name: 'Cardiología',
    },
];

function renderRow() {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <ProfessionalSpecialtyRow
                membership={MEMBERSHIP}
                canManage
                credentials={CREDENTIALS}
                assigned={ASSIGNED}
            />
        </QueryClientProvider>,
    );
}

describe('ProfessionalSpecialtyRow', () => {
    beforeEach(() => {
        vi.mocked(api.delete).mockReset();
        invalidate.mockReset();
    });

    it('requires confirmation before removing a professional specialty', async () => {
        vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });
        renderRow();

        fireEvent.click(
            await screen.findByRole('checkbox', { name: 'Cardiología' }),
        );

        expect(api.delete).not.toHaveBeenCalled();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Confirmar' }),
        );

        await waitFor(() =>
            expect(api.delete).toHaveBeenCalledWith(
                '/memberships/3/specialties/1',
            ),
        );
        await waitFor(() => expect(invalidate).toHaveBeenCalled());
    });
});
