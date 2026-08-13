import { api } from '@/lib/api';
import type { Professional } from '@/types/professional';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route } from '../index';

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
