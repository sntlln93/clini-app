import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import type { ProfessionalSpecialty, Specialty } from '@/types/professional';
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
    slug: null,
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

const BACKED: Specialty[] = [
    { id: 1, name: 'Cardiología', profession: 'medico' },
    { id: 2, name: 'Pediatría', profession: 'medico' },
];

const ASSIGNED: ProfessionalSpecialty[] = [
    {
        id: 20,
        membership_id: 3,
        specialty_id: 1,
        specialty_name: 'Cardiología',
    },
];

function renderRow({
    backed = BACKED,
    assigned = ASSIGNED,
}: { backed?: Specialty[]; assigned?: ProfessionalSpecialty[] } = {}) {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <ProfessionalSpecialtyRow
                membership={MEMBERSHIP}
                canManage
                backed={backed}
                assigned={assigned}
            />
        </QueryClientProvider>,
    );
}

describe('ProfessionalSpecialtyRow', () => {
    beforeEach(() => {
        vi.mocked(api.delete).mockReset();
        invalidate.mockReset();
    });

    it('exposes the specialty checkbox by its specialty name', async () => {
        renderRow();

        expect(
            await screen.findByRole('checkbox', { name: 'Cardiología' }),
        ).not.toBeNull();
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

    it('offers only what a verified license backs, with nothing marked', async () => {
        renderRow();

        const pediatrics = await screen.findByRole('checkbox', {
            name: 'Pediatría',
        });
        expect(pediatrics.getAttribute('aria-checked')).toBe('false');
        expect(pediatrics.hasAttribute('data-disabled')).toBe(false);
        expect(screen.queryByText('Sin respaldo de matrícula')).toBeNull();
    });

    it('keeps an offered specialty no license backs anymore, marked, and only lets it be taken off', async () => {
        renderRow({ backed: [BACKED[1]] });

        const cardiology = await screen.findByRole('checkbox', {
            name: 'Cardiología',
        });
        expect(cardiology.getAttribute('aria-checked')).toBe('true');
        expect(cardiology.hasAttribute('data-disabled')).toBe(false);
        screen.getByText('Sin respaldo de matrícula');
    });

    it('says where the specialties come from when no license backs any', async () => {
        renderRow({ backed: [], assigned: [] });

        await screen.findByText(/Ajustes › Matrículas/);
        expect(screen.queryByRole('checkbox')).toBeNull();
    });
});
