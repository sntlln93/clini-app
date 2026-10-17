import { renderRoute } from '@/tests/render-route';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuditSubjectLink } from '../-components/AuditSubjectLink';

const LINK_TARGETS = [
    '/organizaciones/$id',
    '/usuarios/$id',
    '/suscripciones/$id',
];

describe('AuditSubjectLink', () => {
    it.each([
        ['organization', '/organizaciones/3'],
        ['user', '/usuarios/3'],
        ['subscription', '/suscripciones/3'],
    ] as const)('links a %s to its detail page', async (type, href) => {
        await renderRoute(
            <AuditSubjectLink subject={{ type, id: 3, label: 'Sujeto' }} />,
            { path: '/auditoria', linkTargets: LINK_TARGETS },
        );

        expect(
            screen.getByRole('link', { name: 'Sujeto' }).getAttribute('href'),
        ).toBe(href);
    });

    it('shows a contact request as text: it has no detail page', async () => {
        await renderRoute(
            <AuditSubjectLink
                subject={{
                    type: 'contact_request',
                    id: 3,
                    label: 'Consulta #3',
                }}
            />,
            { path: '/auditoria', linkTargets: LINK_TARGETS },
        );

        expect(screen.getByText('Consulta #3')).toBeTruthy();
        expect(screen.getByText('Consulta')).toBeTruthy();
        expect(screen.queryByRole('link')).toBeNull();
    });
});
