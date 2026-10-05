import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { adminSessionQueryOptions } from './session';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

describe('adminSessionQueryOptions', () => {
    it('reads GET /admin/me and unwraps its `data` envelope', async () => {
        const admin = {
            id: 1,
            name: 'Olivia Operadora',
            email: 'operador@test.com',
            last_login_at: '2026-10-04T15:00:00+00:00',
        };
        vi.mocked(api.get).mockResolvedValueOnce({ data: { data: admin } });

        const result = await new QueryClient().fetchQuery(
            adminSessionQueryOptions,
        );

        expect(api.get).toHaveBeenCalledWith('/admin/me');
        expect(result).toEqual(admin);
    });

    it('marks its 401 as an expected anonymous answer and never retries', () => {
        expect(adminSessionQueryOptions.meta).toEqual({
            expectedUnauthorized: true,
        });
        expect(adminSessionQueryOptions.retry).toBe(false);
        expect(adminSessionQueryOptions.queryKey).toEqual(['admin-session']);
    });
});
