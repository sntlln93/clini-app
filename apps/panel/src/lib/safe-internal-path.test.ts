import { describe, expect, it } from 'vitest';
import { safeInternalPath } from './safe-internal-path';

describe('safeInternalPath', () => {
    it.each([
        '/pacientes/12',
        '/pacientes/12?x=1',
        '/agenda?fecha=2026-10-05&vista=semana#turno',
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
        ['relative path', 'pacientes/12'],
        ['empty string', ''],
        ['the login page', '/login'],
        ['the login page with a query', '/login?redirect=/agenda'],
        ['the login page with a trailing slash', '/login/'],
        ['the register page', '/registro'],
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
