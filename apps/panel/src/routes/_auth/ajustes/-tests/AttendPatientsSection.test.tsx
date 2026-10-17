import { api } from '@/lib/api';
import type { Membership, MembershipRole } from '@/types/membership';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendPatientsSection } from '../-components/AttendPatientsSection';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), patch: vi.fn() },
}));

const invalidate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

function membership(roles: MembershipRole[]): Membership {
    return {
        id: 3,
        user: { id: 9, name: 'Ana', email: 'ana@example.com' },
        roles,
        status: 'active',
        slug: null,
        deleted_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    };
}

function renderSection(roles: MembershipRole[]) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <AttendPatientsSection membership={membership(roles)} />
        </QueryClientProvider>,
    );

    return screen.findByRole('switch', {
        name: 'Atiendo pacientes en este consultorio',
    });
}

describe('AttendPatientsSection', () => {
    beforeEach(() => {
        vi.mocked(api.patch).mockReset();
        vi.mocked(api.get).mockReset();
        invalidate.mockReset();
    });

    it('reflects whether the caller is a professional', async () => {
        const on = await renderSection(['owner', 'professional']);

        expect(on.getAttribute('aria-checked')).toBe('true');
    });

    it('adds the professional role right away when turned on', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        const toggle = await renderSection(['owner']);
        expect(toggle.getAttribute('aria-checked')).toBe('false');

        fireEvent.click(toggle);

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/memberships/3', {
                roles: ['owner', 'professional'],
                status: 'active',
            }),
        );
    });

    it('warns before removing the role, and keeps it if cancelled', async () => {
        const toggle = await renderSection(['owner', 'professional']);

        fireEvent.click(toggle);

        await screen.findByText(/reasignalos o cancelalos antes/);
        expect(api.patch).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        await waitFor(() =>
            expect(screen.queryByText(/reasignalos o cancelalos/)).toBeNull(),
        );
        expect(api.patch).not.toHaveBeenCalled();
    });

    it('removes only the professional role once confirmed', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        const toggle = await renderSection(['owner', 'professional']);

        fireEvent.click(toggle);
        fireEvent.click(
            await screen.findByRole('button', { name: 'Dejar de atender' }),
        );

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/memberships/3', {
                roles: ['owner'],
                status: 'active',
            }),
        );
    });
});
