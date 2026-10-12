import { api } from '@/lib/api';
import { sessionQueryOptions } from '@/lib/session';
import type { MembershipRole } from '@/types/membership';
import type { CatalogSpecialty, UserSpecialty } from '@/types/professional';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MySpecialtiesSection } from '../-components/MySpecialtiesSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const invalidate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

const SPECIALTIES: CatalogSpecialty[] = [{ id: 1, name: 'Cardiología' }];

const MY_SPECIALTIES: UserSpecialty[] = [
    { id: 5, specialty_id: 1, specialty_name: 'Cardiología' },
];

function renderSection(session?: {
    roles: MembershipRole[];
    permissions: string[];
}) {
    const queryClient = new QueryClient();
    if (session) {
        queryClient.setQueryData(sessionQueryOptions.queryKey, {
            id: 9,
            name: 'Ana',
            email: 'ana@example.com',
            permissions: session.permissions,
            membership: {
                id: 3,
                user: { id: 9, name: 'Ana', email: 'ana@example.com' },
                roles: session.roles,
                status: 'active',
                slug: null,
                deleted_at: null,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
            },
        });
    }
    render(
        <QueryClientProvider client={queryClient}>
            <MySpecialtiesSection
                userId={9}
                specialties={SPECIALTIES}
                mySpecialties={MY_SPECIALTIES}
            />
        </QueryClientProvider>,
    );
}

describe('MySpecialtiesSection', () => {
    beforeEach(() => {
        vi.mocked(api.delete).mockReset();
        invalidate.mockReset();
    });

    it('exposes each specialty checkbox by its specialty name', async () => {
        renderSection();

        expect(
            await screen.findByRole('checkbox', { name: 'Cardiología' }),
        ).not.toBeNull();
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
        await waitFor(() => expect(invalidate).toHaveBeenCalled());
    });

    it('says that specialties alone do not make a non-professional bookable, and offers to join', async () => {
        renderSection({
            roles: ['owner'],
            permissions: ['memberships.manage'],
        });

        await screen.findByText(/Marcar especialidades no te suma a la agenda/);
        screen.getByRole('button', { name: 'Sumarme como profesional' });
    });

    it('points a non-professional without memberships.manage to an administrator', async () => {
        renderSection({ roles: ['staff'], permissions: [] });

        await screen.findByText(/Pedile a un administrador que te lo asigne/);
        expect(
            screen.queryByRole('button', { name: 'Sumarme como profesional' }),
        ).toBeNull();
    });

    it('shows no notice to a professional', async () => {
        renderSection({
            roles: ['owner', 'professional'],
            permissions: ['memberships.manage'],
        });

        await screen.findByRole('checkbox', { name: 'Cardiología' });
        expect(
            screen.queryByText(/Marcar especialidades no te suma a la agenda/),
        ).toBeNull();
    });
});
