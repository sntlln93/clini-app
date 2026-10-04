import { api } from '@/lib/api';
import type { BookingOrganizationResponse } from '@/types/booking';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route } from '../reservar.$slug';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

type BookingSearch = {
    specialty?: number;
    professional?: number;
    service?: number;
    date?: string;
};

// Cast needed: `beforeLoad`'s type is a union that also allows a non-callable object shape, though this route always passes a plain async function.
const beforeLoad = Route.options.beforeLoad as (opts: {
    context: { queryClient: QueryClient };
    params: { slug: string };
    search: BookingSearch;
}) => Promise<void>;

function mockOrganization(
    overrides: Partial<BookingOrganizationResponse> = {},
) {
    const response: BookingOrganizationResponse = {
        organization: {
            name: 'Consultorio Salud',
            slug: 'consultorio-salud',
            timezone: 'America/Argentina/Buenos_Aires',
        },
        professionals: [],
        preselected_membership_id: null,
        ...overrides,
    };
    vi.mocked(api.get).mockResolvedValueOnce({ data: response });
}

describe('/reservar/$slug beforeLoad membership-slug preselection', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    it('redirects to itself with search.professional set when the slug resolves a membership and no professional is selected yet', async () => {
        mockOrganization({ preselected_membership_id: 42 });
        const queryClient = new QueryClient();

        await expect(
            beforeLoad({
                context: { queryClient },
                params: { slug: 'dra-lopez' },
                search: {},
            }),
        ).rejects.toMatchObject({
            options: {
                to: '/reservar/$slug',
                params: { slug: 'dra-lopez' },
                search: { professional: 42 },
            },
        });
    });

    it('does not redirect when the slug resolves an organization (preselected_membership_id null): the full cascade renders as before', async () => {
        mockOrganization({ preselected_membership_id: null });
        const queryClient = new QueryClient();

        await expect(
            beforeLoad({
                context: { queryClient },
                params: { slug: 'consultorio-salud' },
                search: {},
            }),
        ).resolves.toBeUndefined();
    });
});

describe('/reservar/$slug beforeLoad default slot date', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.useFakeTimers({ toFake: ['Date'] });
        // Still Oct 4 in Buenos Aires (UTC-3), the practice's zone below.
        vi.setSystemTime(new Date('2026-10-05T02:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("writes the practice's today into search.date once professional and service are chosen", async () => {
        mockOrganization();

        await expect(
            beforeLoad({
                context: { queryClient: new QueryClient() },
                params: { slug: 'consultorio-salud' },
                search: { professional: 10, service: 100 },
            }),
        ).rejects.toMatchObject({
            options: {
                search: { professional: 10, service: 100, date: '2026-10-04' },
            },
        });
    });

    it('moves a past date from an old link forward to today', async () => {
        mockOrganization();

        await expect(
            beforeLoad({
                context: { queryClient: new QueryClient() },
                params: { slug: 'consultorio-salud' },
                search: { professional: 10, service: 100, date: '2026-09-01' },
            }),
        ).rejects.toMatchObject({
            options: { search: { date: '2026-10-04' } },
        });
    });

    it('keeps a date that is already inside the window', async () => {
        mockOrganization();

        await expect(
            beforeLoad({
                context: { queryClient: new QueryClient() },
                params: { slug: 'consultorio-salud' },
                search: { professional: 10, service: 100, date: '2026-10-04' },
            }),
        ).resolves.toBeUndefined();
    });
});
