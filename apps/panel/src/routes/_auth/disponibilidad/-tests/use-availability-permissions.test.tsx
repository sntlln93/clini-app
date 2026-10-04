import { sessionQueryOptions } from '@/lib/session';
import { subscriptionQueryOptions } from '@/lib/subscription';
import { buildProfessional } from '@/tests/fixtures/professional';
import { buildSubscription } from '@/tests/fixtures/subscription';
import type { Subscription } from '@/types/subscription';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useAvailabilityPermissions } from '../-hooks/use-availability-permissions';

const OWN_PROFESSIONAL = buildProfessional();

function renderPermissions(subscription: Subscription | null | undefined) {
    const queryClient = new QueryClient();
    queryClient.setQueryData(sessionQueryOptions.queryKey, {
        id: 10,
        name: 'Dra. Ana López',
        email: 'ana@example.com',
        permissions: ['availability.manage'],
    });
    if (subscription !== undefined) {
        queryClient.setQueryData(
            subscriptionQueryOptions.queryKey,
            subscription,
        );
    }

    return renderHook(() => useAvailabilityPermissions(), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        ),
    }).result.current;
}

describe('useAvailabilityPermissions under a subscription', () => {
    it.each(['expired', 'cancelled'] as const)(
        'hides availability writes while %s, keeping org-wide browsing',
        (status) => {
            const permissions = renderPermissions(buildSubscription(status));

            expect(permissions.canManage(OWN_PROFESSIONAL)).toBe(false);
            expect(permissions.canWriteOrgWide).toBe(false);
            expect(permissions.canManageOrgWide).toBe(true);
        },
    );

    it.each([
        ['no subscription', null],
        ['not loaded', undefined],
        ['pending', buildSubscription('pending')],
        ['active', buildSubscription('active')],
        ['grace', buildSubscription('grace')],
    ])(
        'keeps availability writes available with %s',
        (_label, subscription) => {
            const permissions = renderPermissions(subscription);

            expect(permissions.canManage(OWN_PROFESSIONAL)).toBe(true);
            expect(permissions.canWriteOrgWide).toBe(true);
        },
    );
});
