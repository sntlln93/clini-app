import { renderInRouter } from '@/tests/render-in-router';
import type { Membership } from '@/types/membership';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemberCard } from '../-components/MemberCard';

function buildMembership(overrides: Partial<Membership> = {}): Membership {
    return {
        id: 4,
        user: { id: 10, name: 'Lucía Fernández', email: 'lucia@example.com' },
        roles: ['professional'],
        status: 'active',
        slug: null,
        specialties: [
            { id: 1, name: 'Cardiología' },
            { id: 2, name: 'Clínica médica' },
        ],
        deleted_at: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

function renderCard(overrides: Partial<Membership> = {}) {
    return renderInRouter(
        <ul>
            <MemberCard membership={buildMembership(overrides)} />
        </ul>,
    );
}

describe('MemberCard', () => {
    it('shows the initials, role, status and specialties, and opens the member', async () => {
        renderCard();

        const link = await screen.findByRole('link', {
            name: 'Lucía Fernández',
        });
        expect(link.getAttribute('href')).toBe('/profesionales/4/editar');
        screen.getByText('LF');
        screen.getByText('Profesional');
        screen.getByText('Activo');
        screen.getByText('Cardiología, Clínica médica');
    });

    it('says when a professional has no specialty yet', async () => {
        renderCard({ specialties: [] });

        await screen.findByText('Sin especialidades cargadas');
    });

    it('shows no specialties for staff', async () => {
        renderCard({ roles: ['staff'], specialties: [] });

        await screen.findByText('Personal');
        expect(screen.queryByText(/especialidad/i)).toBeNull();
    });

    it('opens nothing for a member already removed', async () => {
        renderCard({ status: 'inactive', deleted_at: '2026-05-01T00:00:00Z' });

        await screen.findByText('Lucía Fernández');
        expect(screen.queryByRole('link')).toBeNull();
        screen.getByText('Inactivo');
    });

    it('names an invited member without a name by their email', async () => {
        renderCard({
            user: { id: 11, name: null, email: 'nuevo@example.com' },
        });

        await screen.findByRole('link', { name: 'nuevo@example.com' });
    });
});
