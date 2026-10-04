import { api } from '@/lib/api';
import { subscriptionQueryOptions, useSubscription } from '@/lib/subscription';
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
