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

function mockGet(url: string) {
    if (url === '/users/9/specialties') {
        return Promise.resolve({ data: { data: CREDENTIALS } });
    }
    if (url === '/memberships/3/specialties') {
        return Promise.resolve({ data: { data: ASSIGNED } });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
}

function renderRow() {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <ProfessionalSpecialtyRow membership={MEMBERSHIP} canManage />
        </QueryClientProvider>,
    );
}

describe('ProfessionalSpecialtyRow', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.delete).mockReset();
        vi.mocked(api.get).mockImplementation(mockGet);
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
    });
});
