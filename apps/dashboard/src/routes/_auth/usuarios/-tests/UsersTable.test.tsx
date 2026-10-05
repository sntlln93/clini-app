import { renderRoute } from '@/tests/render-route';
import type { AdminUser } from '@/types/user';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UsersTable } from '../-components/UsersTable';

const BASE: AdminUser = {
    id: 1,
    name: 'Ana Dueña',
    email: 'ana@clini.app',
    email_verified_at: '2026-09-01T12:00:00+00:00',
    blocked_at: null,
    block_reason: null,
    created_at: '2026-09-01T12:00:00+00:00',
    memberships_count: 2,
};

const USERS: AdminUser[] = [
    BASE,
    {
        ...BASE,
        id: 2,
        name: 'Bruno Nuevo',
        email: 'bruno@clini.app',
        email_verified_at: null,
    },
    {
        ...BASE,
        id: 3,
        name: 'Carla Bloqueada',
        email: 'carla@clini.app',
        blocked_at: '2026-10-01T12:00:00+00:00',
        block_reason: 'Spam',
    },
];

function rowOf(name: string) {
    return screen.getByRole('link', { name }).closest('tr') as HTMLElement;
}

describe('UsersTable', () => {
    it('shows active, unverified and blocked states, blocked winning', async () => {
        await renderRoute(<UsersTable users={USERS} empty={null} />, {
            path: '/usuarios',
            linkTargets: ['/usuarios/$id'],
        });

        within(rowOf('Ana Dueña')).getByText('Activo');
        within(rowOf('Bruno Nuevo')).getByText('Sin verificar');
        within(rowOf('Carla Bloqueada')).getByText('Bloqueado');
    });

    it('links to the user detail and shows the email under the name', async () => {
        await renderRoute(<UsersTable users={USERS} empty={null} />, {
            path: '/usuarios',
            linkTargets: ['/usuarios/$id'],
        });

        expect(
            screen
                .getByRole('link', { name: 'Bruno Nuevo' })
                .getAttribute('href'),
        ).toBe('/usuarios/2');
        within(rowOf('Bruno Nuevo')).getByText('bruno@clini.app');
    });
});
