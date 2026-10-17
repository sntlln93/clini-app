import { planQueryOptions } from '@/lib/plan';
import { subscriptionQueryOptions } from '@/lib/subscription';
import { buildPlan } from '@/tests/fixtures/plan';
import { buildSubscription } from '@/tests/fixtures/subscription';
import type { MembershipRole } from '@/types/membership';
import type { Plan } from '@/types/plan';
import type { Subscription } from '@/types/subscription';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MemberPlanNote } from '../-components/MemberPlanNote';
import { gainedActiveRoles } from '../-components/member-plan';

vi.mock('@tanstack/react-router', () => ({
    Link: ({ children, to }: { children: ReactNode; to: string }) => (
        <a href={to}>{children}</a>
    ),
}));

function renderNote(
    plan: Plan | undefined,
    roles: MembershipRole[],
    subscription?: Subscription,
) {
    const queryClient = new QueryClient();
    if (plan) {
        queryClient.setQueryData(planQueryOptions.queryKey, plan);
    }
    if (subscription) {
        queryClient.setQueryData(
            subscriptionQueryOptions.queryKey,
            subscription,
        );
    }

    return render(
        <QueryClientProvider client={queryClient}>
            <MemberPlanNote gainedRoles={roles} />
        </QueryClientProvider>,
    );
}

/** Intl's currency format separates the sign with a non-breaking space. */
function plainText(container: HTMLElement): string {
    return (container.textContent ?? '').replace(/\s/g, ' ');
}

describe('MemberPlanNote', () => {
    it('explains Free allows a single professional and no team, linking to the plans', () => {
        renderNote(buildPlan('free'), ['professional']);

        expect(
            screen.getByText(/El plan Gratis incluye un solo profesional/),
        ).not.toBeNull();
        expect(
            screen
                .getByRole('link', { name: 'Ver planes' })
                .getAttribute('href'),
        ).toBe('/ajustes');
    });

    it('shows the new Consultorio amount before inviting a professional past the included ones', () => {
        const { container } = renderNote(
            buildPlan('practice', { active_professionals: 5 }),
            ['professional'],
        );

        expect(plainText(container)).toContain(
            'Con este profesional, tu suscripción pasa a $ 20.000 por mes desde el próximo cobro: 6 profesionales activos, con 5 incluidos.',
        );
    });

    it('quotes monthly while a yearly checkout is unpaid', () => {
        const { container } = renderNote(
            buildPlan('practice', { active_professionals: 5 }),
            ['professional'],
            buildSubscription('cancelled', { billing: 'annual' }),
        );

        expect(plainText(container)).toContain('$ 20.000 por mes');
    });

    it('on a yearly subscription shows the new yearly amount, from its next renewal', () => {
        const { container } = renderNote(
            buildPlan('practice', { active_professionals: 5 }),
            ['professional'],
            buildSubscription('active', { billing: 'annual' }),
        );

        // $ 20.000 × 60% = $ 12.000 a month.
        expect(plainText(container)).toContain(
            'Con este profesional, tu suscripción pasa a $ 144.000 por año desde la próxima renovación anual: 6 profesionales activos, con 5 incluidos.',
        );
    });

    it.each([
        [
            'within the included professionals',
            buildPlan('practice', { active_professionals: 3 }),
            ['professional'],
        ],
        [
            'for a role that is not billed',
            buildPlan('practice', { active_professionals: 7 }),
            ['staff'],
        ],
        [
            'on Centro',
            buildPlan('center', { active_professionals: 9 }),
            ['professional'],
        ],
        ['with the plan not loaded', undefined, ['professional']],
        ['when nothing is gained', buildPlan('free'), []],
    ] as const)('renders nothing %s', (_label, plan, roles) => {
        const { container } = renderNote(plan, [...roles]);

        expect(container.innerHTML).toBe('');
    });
});

describe('gainedActiveRoles', () => {
    it.each([
        [
            'adding the professional role',
            { roles: ['staff'], status: 'active' },
            ['staff', 'professional'],
            'active',
            ['professional'],
        ],
        [
            'reactivating a professional',
            { roles: ['professional'], status: 'inactive' },
            ['professional'],
            'active',
            ['professional'],
        ],
        [
            'keeping the same roles',
            { roles: ['professional', 'staff'], status: 'active' },
            ['professional', 'staff'],
            'active',
            [],
        ],
        [
            'suspending',
            { roles: ['staff'], status: 'active' },
            ['staff', 'professional'],
            'suspended',
            [],
        ],
    ] as const)('%s', (_label, membership, roles, status, expected) => {
        expect(
            gainedActiveRoles(
                { roles: [...membership.roles], status: membership.status },
                [...roles],
                status,
            ),
        ).toEqual(expected);
    });
});
