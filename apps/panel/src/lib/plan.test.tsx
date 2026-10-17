import {
    planIncludes,
    planQueryOptions,
    practiceAmount,
    practiceMonthlyAmount,
    useAppointmentChangeQueryKeys,
    useWritesRestricted,
} from '@/lib/plan';
import { subscriptionQueryOptions } from '@/lib/subscription';
import { buildPlan } from '@/tests/fixtures/plan';
import { buildSubscription } from '@/tests/fixtures/subscription';
import type { Plan } from '@/types/plan';
import type { Subscription } from '@/types/subscription';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

function restrictedWith(
    subscription: Subscription | null | undefined,
    plan: Plan | undefined,
): boolean {
    const queryClient = new QueryClient();
    if (subscription !== undefined) {
        queryClient.setQueryData(
            subscriptionQueryOptions.queryKey,
            subscription,
        );
    }
    if (plan) {
        queryClient.setQueryData(planQueryOptions.queryKey, plan);
    }

    return renderHook(() => useWritesRestricted(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        ),
    }).result.current;
}

describe('useWritesRestricted', () => {
    it.each([
        [
            'an expired subscription',
            buildSubscription('expired'),
            buildPlan('practice'),
            true,
        ],
        [
            'Free over its professional limit',
            null,
            buildPlan('free', { active_professionals: 2 }),
            true,
        ],
        ['Free within its limit', null, buildPlan('free'), false],
        [
            'a cancelled subscription on Free',
            buildSubscription('cancelled'),
            buildPlan('free'),
            false,
        ],
        ['nothing loaded', undefined, undefined, false],
    ])('is %s → %s', (_label, subscription, plan, expected) => {
        expect(restrictedWith(subscription, plan)).toBe(expected);
    });
});

describe('useAppointmentChangeQueryKeys', () => {
    function keysWith(plan: Plan | undefined) {
        const queryClient = new QueryClient();
        if (plan) {
            queryClient.setQueryData(planQueryOptions.queryKey, plan);
        }

        return renderHook(() => useAppointmentChangeQueryKeys(), {
            wrapper: ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            ),
        }).result.current;
    }

    it("refreshes the plan too on Free, which counts the month's appointments", () => {
        expect(keysWith(buildPlan('free'))).toEqual([
            ['appointments'],
            ['plan'],
        ]);
    });

    it.each([
        ['a paid plan', buildPlan('practice')],
        ['no plan loaded', undefined],
    ])('refreshes only the appointments on %s', (_label, plan) => {
        expect(keysWith(plan)).toEqual([['appointments']]);
    });
});

describe('planIncludes', () => {
    it('follows the plan, and includes everything when the plan is not loaded', () => {
        expect(planIncludes(buildPlan('free'), 'prescriptions')).toBe(false);
        expect(planIncludes(buildPlan('center'), 'team')).toBe(true);
        expect(planIncludes(undefined, 'waiting_room')).toBe(true);
    });
});

describe('practiceAmount', () => {
    const pricing = buildPlan('practice', {
        practice_pricing: {
            base_amount: 15001,
            included_professionals: 5,
            extra_professional_amount: 0,
            annual_discount_percent: 40,
            currency: 'ARS',
        },
    }).practice_pricing;

    it('charges twelve discounted months, each rounded to whole pesos first, like the API (#240)', () => {
        // $ 15.001 × 60% = $ 9.000,60 → $ 9.001 a month (PracticePricingTest).
        expect(practiceAmount(pricing, 1, 'annual')).toBe(108012);
        expect(practiceAmount(pricing, 1, 'monthly')).toBe(15001);
    });
});

describe('practiceMonthlyAmount', () => {
    it.each([
        [0, 15000],
        [5, 15000],
        [6, 20000],
        [8, 30000],
    ])('charges %s active professionals %s', (count, amount) => {
        expect(
            practiceMonthlyAmount(
                buildPlan('practice').practice_pricing,
                count,
            ),
        ).toBe(amount);
    });
});
