import { api } from '@/lib/api';
import type { Professional } from '@/types/professional';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route as ExceptionsRoute } from '../excepciones';
import { Route as WeekRoute } from '../index';
import { Route } from '../route';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

function professional(id: number, userId: number): Professional {
    return {
        id,
        user: { id: userId, name: `User ${userId}`, email: '' },
    };
}

const PROFESSIONALS = [professional(1, 10), professional(2, 20)];

const SESSION = {
    id: 10,
    name: 'Ana Ejemplo',
    email: 'ana@clini.app',
    permissions: ['availability.manage'] as string[],
};

function mockApiGet() {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/me') {
            return Promise.resolve({ data: SESSION });
        }
        if (url === '/professionals') {
            return Promise.resolve({ data: { data: PROFESSIONALS } });
        }
        if (
            url.startsWith('/memberships/') &&
            url.endsWith('/availabilities')
        ) {
            return Promise.resolve({ data: { data: [] } });
        }
        if (url === '/availability-exceptions') {
            return Promise.resolve({ data: { data: [] } });
        }
        return Promise.reject(new Error(`unexpected GET ${url}`));
    });
}

// Narrowed from the loader union to a plain callable, since this route always passes a plain async function.
const loader = Route.options.loader as (opts: {
    context: { queryClient: QueryClient };
    deps: { membershipId: number | undefined };
}) => Promise<{ selectedId: number | undefined }>;

describe('/disponibilidad loader defaultMembershipId', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        mockApiGet();
    });

    it('selects the first professional when the search param is absent', async () => {
        const queryClient = new QueryClient();

        const result = await loader({
            context: { queryClient },
            deps: { membershipId: undefined },
        });

        expect(result).toMatchObject({ selectedId: PROFESSIONALS[0].id });
    });

    it('respects the search param when it matches an existing professional', async () => {
        const queryClient = new QueryClient();

        const result = await loader({
            context: { queryClient },
            deps: { membershipId: PROFESSIONALS[1].id },
        });

        expect(result).toMatchObject({ selectedId: PROFESSIONALS[1].id });
    });
});

describe('/disponibilidad validateSearch', () => {
    const validate = Route.options.validateSearch as (
        search: Record<string, unknown>,
    ) => { membershipId?: number };

    it('reads the selected professional', () => {
        expect(validate({ membershipId: '2' })).toEqual({ membershipId: 2 });
    });

    it('drops a value that is not a number instead of failing the page', () => {
        expect(validate({ membershipId: 'otro' })).toEqual({
            membershipId: undefined,
        });
    });

    it('carries the professional over to the other sub-page', () => {
        // `retainSearchParams`, called the way the router does: `next` builds
        // the destination's own search, which names no professional.
        const [retain] = (Route.options.search?.middlewares ?? []) as Array<
            (opts: {
                search: { membershipId?: number };
                next: () => { search: object; meta: object };
            }) => unknown
        >;

        expect(
            retain({
                search: { membershipId: 2 },
                next: () => ({ search: {}, meta: {} }),
            }),
        ).toEqual({ membershipId: 2 });
    });
});

describe('/disponibilidad sub-pages', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        mockApiGet();
    });

    // Narrowed from the loader union to the plain async function both pass.
    function loaderOf<T>(route: { options: { loader?: unknown } }) {
        return route.options.loader as (opts: {
            context: { queryClient: QueryClient };
            deps: { membershipId: number | undefined };
        }) => Promise<T>;
    }

    it('reads only the week on «Semana habitual»', async () => {
        const result = await loaderOf<{ selected: Professional }>(WeekRoute)({
            context: { queryClient: new QueryClient() },
            deps: { membershipId: PROFESSIONALS[1].id },
        });

        expect(result.selected).toEqual(PROFESSIONALS[1]);
        expect(api.get).toHaveBeenCalledWith('/memberships/2/availabilities');
        expect(api.get).not.toHaveBeenCalledWith(
            '/availability-exceptions',
            expect.anything(),
        );
    });

    it('reads only the exceptions on «Excepciones»', async () => {
        const result = await loaderOf<{ selected: Professional }>(
            ExceptionsRoute,
        )({
            context: { queryClient: new QueryClient() },
            deps: { membershipId: undefined },
        });

        expect(result.selected).toEqual(PROFESSIONALS[0]);
        expect(api.get).toHaveBeenCalledWith('/availability-exceptions', {
            params: { membership_id: 1 },
        });
        expect(api.get).not.toHaveBeenCalledWith(
            '/memberships/1/availabilities',
        );
    });
});
