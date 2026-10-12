import { api } from '@/lib/api';
import { sessionQueryOptions, type SessionUser } from '@/lib/session';
import type { Membership, MembershipRole } from '@/types/membership';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NoProfessionalsEmptyState } from './NoProfessionalsEmptyState';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), patch: vi.fn() },
}));

function membership(roles: MembershipRole[]): Membership {
    return {
        id: 7,
        user: { id: 1, name: 'Ana', email: 'ana@example.com' },
        roles,
        status: 'active',
        slug: null,
        deleted_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    };
}

function renderEmptyState(
    permissions: string[],
    ownMembership: Membership | null = null,
) {
    const queryClient = new QueryClient();
    const session: SessionUser = {
        id: 1,
        name: 'Ana',
        email: 'ana@example.com',
        permissions,
        membership: ownMembership,
    };
    queryClient.setQueryData(sessionQueryOptions.queryKey, session);
    const router = createRouter({
        routeTree: createRootRoute({
            component: () => (
                <QueryClientProvider client={queryClient}>
                    <NoProfessionalsEmptyState description="Invitá a un profesional para configurar sus horarios." />
                </QueryClientProvider>
            ),
        }),
        history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
}

describe('NoProfessionalsEmptyState', () => {
    beforeEach(() => {
        vi.mocked(api.patch).mockReset();
        vi.mocked(api.get).mockReset();
    });

    it('offers the invite CTA with memberships.manage', async () => {
        renderEmptyState(['memberships.manage']);

        const cta = await screen.findByRole('button', {
            name: 'Invitar profesional',
        });
        expect(cta.getAttribute('href')).toBe('/profesionales/nuevo');
        screen.getByText(
            'Invitá a un profesional para configurar sus horarios.',
        );
    });

    it('tells who to ask, with no CTA, without memberships.manage', async () => {
        renderEmptyState(['availability.view'], membership(['staff']));

        await screen.findByText(
            'Pedile a un administrador que invite a un profesional.',
        );
        expect(
            screen.queryByRole('button', { name: 'Invitar profesional' }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Sumarme como profesional' }),
        ).toBeNull();
    });

    it('lets an owner who is not a professional add the role to their own membership', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        vi.mocked(api.get).mockResolvedValue({ data: {} });
        renderEmptyState(['memberships.manage'], membership(['owner']));

        await screen.findByText(
            'Si atendés pacientes, sumate como profesional. Invitá a un profesional para configurar sus horarios.',
        );
        screen.getByRole('button', { name: 'Invitar profesional' });
        fireEvent.click(
            screen.getByRole('button', { name: 'Sumarme como profesional' }),
        );

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/memberships/7', {
                roles: ['owner', 'professional'],
                status: 'active',
            }),
        );
    });

    it('does not offer joining to a manager who is already a professional', async () => {
        renderEmptyState(
            ['memberships.manage'],
            membership(['owner', 'professional']),
        );

        await screen.findByRole('button', { name: 'Invitar profesional' });
        expect(
            screen.queryByRole('button', { name: 'Sumarme como profesional' }),
        ).toBeNull();
    });
});
