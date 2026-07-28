import { api } from '@/lib/api';
import type { CatalogSpecialty, UserSpecialty } from '@/types/professional';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MySpecialtiesSection } from '../-components/MySpecialtiesSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const SESSION = { id: 9, name: 'Ana Gomez', email: 'ana@clini.app' };

const SPECIALTIES: CatalogSpecialty[] = [{ id: 1, name: 'Cardiología' }];

const MY_SPECIALTIES: UserSpecialty[] = [
    { id: 5, specialty_id: 1, specialty_name: 'Cardiología' },
];

function mockGet(url: string) {
    if (url === '/me') {
        return Promise.resolve({ data: SESSION });
    }
    if (url === '/specialties') {
        return Promise.resolve({ data: { data: SPECIALTIES } });
    }
    if (url === '/users/9/specialties') {
        return Promise.resolve({ data: { data: MY_SPECIALTIES } });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
}

function renderSection() {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <MySpecialtiesSection />
        </QueryClientProvider>,
    );
}

describe('MySpecialtiesSection', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.delete).mockReset();
        vi.mocked(api.get).mockImplementation(mockGet);
    });

    it('requires confirmation before removing one of the user own specialties', async () => {
        vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });
        renderSection();

        fireEvent.click(
            await screen.findByRole('checkbox', { name: 'Cardiología' }),
        );

        expect(api.delete).not.toHaveBeenCalled();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Confirmar' }),
        );

        await waitFor(() =>
            expect(api.delete).toHaveBeenCalledWith('/users/9/specialties/1'),
        );
    });
});
