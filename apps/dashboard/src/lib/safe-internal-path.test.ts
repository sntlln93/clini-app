import { describe, expect, it } from 'vitest';
import { safeInternalPath } from './safe-internal-path';

describe('safeInternalPath', () => {
    it.each([
        '/organizaciones/12',
        '/organizaciones/12?q=norte',
        '/estadisticas?from=2026-09-01&to=2026-09-30#turnos',
        '/registro',
        '/loginx',
    ])('accepts the internal path %s', (value) => {
        expect(safeInternalPath(value)).toBe(value);
    });

    it.each([
        ['protocol-relative', '//evil.com'],
        ['absolute URL', 'https://evil.com'],
        ['backslash', '/\\evil.com'],
        ['tab that browsers strip', '/\t/evil.com'],
        ['newline', '/\n/evil.com'],
        ['relative path', 'organizaciones/12'],
        ['empty string', ''],
        ['the login page', '/login'],
        ['the login page with a query', '/login?redirect=/usuarios'],
        ['the login page with a trailing slash', '/login/'],
    ])('rejects a %s', (_, value) => {
        expect(safeInternalPath(value)).toBeUndefined();
    });

    it.each([undefined, null, 12, { href: '/x' }])(
        'rejects the non-string %s',
        (value) => {
            expect(safeInternalPath(value)).toBeUndefined();
        },
    );
});
