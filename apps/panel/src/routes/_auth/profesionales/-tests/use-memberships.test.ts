import { api } from '@/lib/api';
import type { Membership } from '@/types/membership';
import { describe, expect, it, vi } from 'vitest';
import { membershipQueryOptions } from '../-hooks/use-memberships';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

const MEMBERSHIP: Membership = {
    id: 5,
    user: { id: 1, name: 'Ana Gomez', email: 'ana@clini.app' },
    roles: ['owner', 'professional'],
    status: 'active',
    slug: null,
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

describe('membershipQueryOptions', () => {
    it('produces the id-scoped query key', () => {
        const options = membershipQueryOptions(5);

        expect(options.queryKey).toEqual(['memberships', 5]);
    });

    it('requests /memberships/:id and resolves to the unwrapped membership', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            data: { data: MEMBERSHIP },
        });

        const options = membershipQueryOptions(5);
        // queryFn is always defined on the options we build here.
        const result = await options.queryFn!({} as never);

        expect(api.get).toHaveBeenCalledWith('/memberships/5');
        expect(result).toEqual(MEMBERSHIP);
    });
});
