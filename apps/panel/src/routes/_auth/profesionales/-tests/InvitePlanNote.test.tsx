import { planQueryOptions } from '@/lib/plan';
import { buildPlan } from '@/tests/fixtures/plan';
import type { MembershipRole } from '@/types/membership';
import type { Plan } from '@/types/plan';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { InvitePlanNote } from '../-components/InvitePlanNote';

vi.mock('@tanstack/react-router', () => ({
    Link: ({ children, to }: { children: ReactNode; to: string }) => (
        <a href={to}>{children}</a>
    ),
}));

function renderNote(plan: Plan | undefined, roles: MembershipRole[]) {
    const queryClient = new QueryClient();
    if (plan) {
        queryClient.setQueryData(planQueryOptions.queryKey, plan);
    }

    return render(
        <QueryClientProvider client={queryClient}>
            <InvitePlanNote roles={roles} />
        </QueryClientProvider>,
    );
}

/** Intl's currency format separates the sign with a non-breaking space. */
function plainText(container: HTMLElement): string {
    return (container.textContent ?? '').replace(/\s/g, ' ');
}

describe('InvitePlanNote', () => {
    it('explains Free invites a single professional and no team, linking to the plans', () => {
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
            'tu suscripción pasa a $ 20.000 por mes desde el próximo cobro: 6 profesionales activos, con 5 incluidos.',
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
    ] as const)('renders nothing %s', (_label, plan, roles) => {
        const { container } = renderNote(plan, [...roles]);

        expect(container.innerHTML).toBe('');
    });
});
