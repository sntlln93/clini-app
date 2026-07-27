import type { Membership } from '@/types/membership';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MembersTable } from '../-components/MembersTable';

const MEMBERSHIPS: Membership[] = [
    {
        id: 1,
        user: { id: 1, name: 'Ana Gomez', email: 'ana@clini.app' },
        roles: ['owner', 'professional'],
        status: 'active',
        deleted_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
];

describe('MembersTable', () => {
    it('renders one row per membership with name, email, roles and status in Spanish', async () => {
        render(<MembersTable memberships={MEMBERSHIPS} onEdit={vi.fn()} />);

        await screen.findByText('Ana Gomez');
        screen.getByText('ana@clini.app');
        screen.getByText('Propietario');
        screen.getByText('Profesional');
        screen.getByText('Activo');
    });

    it('renders the empty state when the list is empty', async () => {
        render(<MembersTable memberships={[]} onEdit={vi.fn()} />);

        await screen.findAllByRole('columnheader');
        expect(screen.queryAllByRole('row')).toHaveLength(1);
    });
});
