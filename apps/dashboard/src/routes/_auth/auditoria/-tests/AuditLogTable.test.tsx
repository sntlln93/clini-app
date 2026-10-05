import { renderRoute } from '@/tests/render-route';
import type { AdminAuditLog } from '@/types/audit';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuditLogTable } from '../-components/AuditLogTable';

const OPERATOR = {
    id: 1,
    name: 'Olivia Operadora',
    email: 'operador@test.com',
};

function log(overrides: Partial<AdminAuditLog>): AdminAuditLog {
    return {
        id: 1,
        action: 'auth.login',
        platform_admin: OPERATOR,
        subject: null,
        metadata: {},
        ip: '10.0.0.1',
        created_at: '2026-10-04T15:00:00+00:00',
        ...overrides,
    };
}

const LOGS: AdminAuditLog[] = [
    log({
        id: 1,
        action: 'organizations.suspend',
        subject: { type: 'organization', id: 7, label: 'Consultorio Norte' },
        metadata: { subject_label: 'Consultorio Norte', reason: 'Fraude' },
    }),
    log({
        id: 2,
        action: 'users.block',
        subject: { type: 'user', id: 4, label: 'ana@clini.app' },
    }),
    log({
        id: 3,
        action: 'subscriptions.extend_grace',
        subject: { type: 'subscription', id: 9, label: 'Clínica Sur' },
    }),
    log({ id: 4, action: 'auth.login' }),
];

function renderTable() {
    return renderRoute(<AuditLogTable logs={LOGS} empty={null} />, {
        path: '/auditoria',
        linkTargets: [
            '/organizaciones/$id',
            '/usuarios/$id',
            '/suscripciones/$id',
        ],
    });
}

describe('AuditLogTable', () => {
    it('renders the Spanish action labels', async () => {
        await renderTable();

        screen.getByText('Suspendió una organización');
        screen.getByText('Bloqueó un usuario');
        screen.getByText('Extendió un período de gracia');
        screen.getByText('Inició sesión');
    });

    it('links each subject to its own detail page', async () => {
        await renderTable();

        expect(
            screen
                .getByRole('link', { name: 'Consultorio Norte' })
                .getAttribute('href'),
        ).toBe('/organizaciones/7');
        expect(
            screen
                .getByRole('link', { name: 'ana@clini.app' })
                .getAttribute('href'),
        ).toBe('/usuarios/4');
        expect(
            screen
                .getByRole('link', { name: 'Clínica Sur' })
                .getAttribute('href'),
        ).toBe('/suscripciones/9');
    });

    it('opens the metadata of a row as JSON', async () => {
        await renderTable();

        fireEvent.click(screen.getAllByRole('button', { name: 'Detalle' })[0]);

        const dialog = await screen.findByRole('dialog');
        expect(dialog.querySelector('pre')?.textContent).toBe(
            JSON.stringify(LOGS[0].metadata, null, 2),
        );
    });
});
