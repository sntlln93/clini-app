import { api } from '@/lib/api';
import {
    isSubscriptionCancellable,
    paidPeriodEnd,
    subscriptionQueryOptions,
    useSubscription,
} from '@/lib/subscription';
import { buildSubscription } from '@/tests/fixtures/subscription';
import type { Subscription } from '@/types/subscription';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

function wrapperWith(value: Subscription | null | undefined) {
    const queryClient = new QueryClient();
    if (value !== undefined) {
        queryClient.setQueryData(subscriptionQueryOptions.queryKey, value);
    }

    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );
    };
}

describe('useSubscription', () => {
    it('observes the cached subscription without fetching it', () => {
        const { result } = renderHook(() => useSubscription(), {
            wrapper: wrapperWith(buildSubscription('grace')),
        });

        expect(result.current?.status).toBe('grace');
        expect(api.get).not.toHaveBeenCalled();
    });

    it('is undefined, and never fetches, when the loader did not read it', () => {
        const { result } = renderHook(() => useSubscription(), {
            wrapper: wrapperWith(undefined),
        });

        expect(result.current).toBeUndefined();
        expect(api.get).not.toHaveBeenCalled();
    });
});

describe('isSubscriptionCancellable', () => {
    it.each([
        ['active', true],
        ['grace', true],
        ['expired', true],
        ['pending', false],
        ['cancelled', false],
    ] as const)('is %s → %s', (status, expected) => {
        expect(isSubscriptionCancellable(buildSubscription(status))).toBe(
            expected,
        );
    });

    it('is false without a subscription', () => {
        expect(isSubscriptionCancellable(null)).toBe(false);
    });
});

describe('paidPeriodEnd', () => {
    const now = new Date('2026-10-10T12:00:00Z');

    it('is the renewal date of an active subscription still ahead', () => {
        expect(
            paidPeriodEnd(
                buildSubscription('active', {
                    next_payment_at: '2026-11-03T12:00:00+00:00',
                }),
                now,
            ),
        ).toBe('2026-11-03T12:00:00+00:00');
    });

    it.each([
        ['an active one with no renewal date', buildSubscription('active')],
        [
            'an active one whose renewal date passed',
            buildSubscription('active', {
                next_payment_at: '2026-10-10T12:00:00+00:00',
            }),
        ],
        [
            'one in grace, which owes its current period',
            buildSubscription('grace', {
                next_payment_at: '2026-11-03T12:00:00+00:00',
            }),
        ],
        ['an expired one', buildSubscription('expired')],
    ])('is null for %s', (_label, subscription) => {
        expect(paidPeriodEnd(subscription, now)).toBeNull();
    });
});
