import { planQueryOptions } from '@/lib/plan';
import { sessionQueryOptions, type SessionUser } from '@/lib/session';
import type { Membership, MembershipRole } from '@/types/membership';
import type { Plan, PlanId } from '@/types/plan';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SetupChecklist } from '../-components/SetupChecklist';
import type { SetupProgress } from '../-hooks/setup-progress';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), patch: vi.fn() },
}));

const NOTHING_DONE: SetupProgress = {
    has_professional: false,
    has_service: false,
    has_availability: false,
    ready: false,
};

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

function renderChecklist(
    progress: SetupProgress,
    {
        roles = ['owner'],
        plan = 'free',
    }: { roles?: MembershipRole[]; plan?: PlanId } = {},
) {
    const queryClient = new QueryClient();
    const session: SessionUser = {
        id: 1,
        name: 'Ana',
        email: 'ana@example.com',
        permissions: ['memberships.manage'],
        membership: membership(roles),
    };
    queryClient.setQueryData(sessionQueryOptions.queryKey, session);
    queryClient.setQueryData(planQueryOptions.queryKey, { plan } as Plan);
    const router = createRouter({
        routeTree: createRootRoute({
            component: () => (
                <QueryClientProvider client={queryClient}>
                    <SetupChecklist progress={progress} />
                </QueryClientProvider>
            ),
        }),
        history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
}

describe('SetupChecklist', () => {
    it('walks a practice with nothing set up through every step, each linking to its page', async () => {
        renderChecklist(NOTHING_DONE);

        await screen.findByRole('region', { name: 'Primeros pasos' });
        expect(
            screen
                .getByRole('button', { name: 'Invitar profesional' })
                .getAttribute('href'),
        ).toBe('/profesionales/nuevo');
        screen.getByRole('button', { name: 'Sumarme como profesional' });
        expect(
            screen
                .getByRole('button', { name: 'Ir a Ajustes' })
                .getAttribute('href'),
        ).toBe('/ajustes');
        expect(
            screen
                .getByRole('button', { name: 'Ir a Disponibilidad' })
                .getAttribute('href'),
        ).toBe('/disponibilidad');
        expect(
            screen
                .getByRole('button', { name: 'Ver planes' })
                .getAttribute('href'),
        ).toBe('/ajustes#suscripcion');
    });

    it('marks done steps and drops their actions', async () => {
        renderChecklist(
            { ...NOTHING_DONE, has_professional: true, has_service: true },
            { roles: ['owner', 'professional'] },
        );

        await screen.findByText('Sumá a quien atiende');
        expect(screen.getAllByText('(listo)')).toHaveLength(2);
        expect(
            screen.queryByRole('button', { name: 'Invitar profesional' }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Ir a Ajustes' }),
        ).toBeNull();
        screen.getByRole('button', { name: 'Ir a Disponibilidad' });
    });

    it('does not offer to join to someone who already is a professional', async () => {
        renderChecklist(NOTHING_DONE, { roles: ['owner', 'professional'] });

        await screen.findByRole('button', { name: 'Invitar profesional' });
        expect(
            screen.queryByRole('button', { name: 'Sumarme como profesional' }),
        ).toBeNull();
    });

    it('leaves out the plan step on a paid plan', async () => {
        renderChecklist(NOTHING_DONE, { plan: 'practice' });

        await screen.findByText('Configurá los horarios');
        expect(screen.queryByText('Elegí tu plan')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Ver planes' })).toBeNull();
    });
});
