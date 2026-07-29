import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route } from '../index';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

// Mirrors the route file's own date-range math so the test's expectation is
// derived independently of the loader under test, not copy-pasted from it.
function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

function endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function startOfWeek(date: Date): Date {
    const result = startOfDay(date);
    result.setDate(result.getDate() - result.getDay());
    return result;
}

function endOfWeek(date: Date): Date {
    return endOfDay(addDays(startOfWeek(date), 6));
}

// `loader` is typed as a union that also allows a pre-built loader-object
// shape (not directly callable), even though this route always passes a
// plain async function — narrow it back to that for the test.
const loader = Route.options.loader as (opts: {
    context: { queryClient: QueryClient };
    deps: { date: string; view: 'day' | 'week' };
}) => Promise<unknown>;

const PROFESSIONALS: Membership[] = [];

function mockApiGet() {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/memberships') {
            return Promise.resolve({ data: { data: PROFESSIONALS } });
        }
        if (url === '/appointments') {
            return Promise.resolve({ data: { data: [] } });
        }
        return Promise.reject(new Error(`unexpected GET ${url}`));
    });
}

describe('/agenda loader date range', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        mockApiGet();
    });

    it('requests the day range for view: "day"', async () => {
        const queryClient = new QueryClient();
        const date = new Date(2026, 0, 15); // Thursday, Jan 15 2026

        await loader({
            context: { queryClient },
            deps: { date: '2026-01-15', view: 'day' },
        });

        expect(api.get).toHaveBeenCalledWith('/appointments', {
            params: {
                from: startOfDay(date).toISOString(),
                to: endOfDay(date).toISOString(),
                membership_id: undefined,
            },
        });
    });

    it('requests the week range for view: "week"', async () => {
        const queryClient = new QueryClient();
        const date = new Date(2026, 0, 15); // Thursday, Jan 15 2026

        await loader({
            context: { queryClient },
            deps: { date: '2026-01-15', view: 'week' },
        });

        expect(api.get).toHaveBeenCalledWith('/appointments', {
            params: {
                from: startOfWeek(date).toISOString(),
                to: endOfWeek(date).toISOString(),
                membership_id: undefined,
            },
        });
    });
});
