import type { Professional } from '@/types/professional';

/** Shared roster-endpoint fixture — mirrors `GET /professionals`' shape, not `Membership`'s. */
export function buildProfessional(
    overrides: Partial<Professional> = {},
): Professional {
    return {
        id: 1,
        user: { id: 10, name: 'Dra. Ana López', email: 'ana@example.com' },
        ...overrides,
    };
}
