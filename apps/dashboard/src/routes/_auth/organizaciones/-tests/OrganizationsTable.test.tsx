import { renderRoute } from '@/tests/render-route';
import type { AdminOrganization } from '@/types/organization';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrganizationsTable } from '../-components/OrganizationsTable';

const BASE: AdminOrganization = {
    id: 1,
    name: 'Consultorio Norte',
    slug: 'consultorio-norte',
    timezone: 'America/Argentina/Buenos_Aires',
    created_at: '2026-09-01T12:00:00+00:00',
    suspended_at: null,
    suspension_reason: null,
    active_members_count: 3,
    subscription: { status: 'active', grace_ends_at: null },
};

const ORGANIZATIONS: AdminOrganization[] = [
    BASE,
    {
        ...BASE,
        id: 2,
        name: 'Clínica Sur',
        slug: 'clinica-sur',
        suspended_at: '2026-10-01T12:00:00+00:00',
        suspension_reason: 'Fraude',
        subscription: null,
    },
    {
        ...BASE,
        id: 3,
        name: 'Centro Oeste',
        slug: 'centro-oeste',
        subscription: { status: 'grace', grace_ends_at: null },
    },
];

function renderTable(organizations = ORGANIZATIONS) {
    return renderRoute(
        <OrganizationsTable
            organizations={organizations}
            empty={<p>Vacío</p>}
        />,
        { path: '/organizaciones', linkTargets: ['/organizaciones/$id'] },
    );
}

function rowOf(name: string) {
    return screen.getByRole('link', { name }).closest('tr') as HTMLElement;
}

describe('OrganizationsTable', () => {
    it('shows the moderation and subscription state of each organization', async () => {
        await renderTable();

        // Organization state and subscription status both read "Activa" here.
        expect(
            within(rowOf('Consultorio Norte')).getAllByText('Activa'),
        ).toHaveLength(2);
        const sur = within(rowOf('Clínica Sur'));
        sur.getByText('Suspendida');
        sur.getByText('Sin suscripción');
        within(rowOf('Centro Oeste')).getByText('En gracia');
    });

    it('links each row to its detail page', async () => {
        const { router } = await renderTable();

        const link = screen.getByRole('link', { name: 'Clínica Sur' });
        expect(link.getAttribute('href')).toBe('/organizaciones/2');

        fireEvent.click(link);
        await screen.findByText('Página /organizaciones/$id');
        expect(router.state.location.pathname).toBe('/organizaciones/2');
    });

    it('renders the empty state when there are no rows', async () => {
        await renderTable([]);

        screen.getByText('Vacío');
    });
});
