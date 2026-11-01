import { defaultParseSearch, isRedirect } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';
import { Route as AjustesIndexRoute } from '../index';
import { Route as SuscripcionRoute } from '../suscripcion';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

// Cast narrows the union type back to the plain function this route passes.
const validateSearch = SuscripcionRoute.options.validateSearch as (
    search: Record<string, unknown>,
) => { suscripcion?: 'retorno' };

const beforeLoad = AjustesIndexRoute.options.beforeLoad as (opts: {
    search: { suscripcion?: 'retorno' };
}) => void;

function redirectOf(search: { suscripcion?: 'retorno' }) {
    try {
        beforeLoad({ search });
    } catch (error) {
        expect(isRedirect(error)).toBe(true);
        return (error as { options: { to: string; search?: unknown } }).options;
    }
    throw new Error('expected a redirect');
}

describe('/ajustes/suscripcion validateSearch', () => {
    it('reads the checkout return flag the API redirect appends', () => {
        expect(
            validateSearch(defaultParseSearch('?suscripcion=retorno')),
        ).toEqual({ suscripcion: 'retorno' });
    });

    it('parses a plain visit to no flag', () => {
        expect(validateSearch({})).toEqual({ suscripcion: undefined });
    });

    it('drops an unknown value instead of failing the page', () => {
        expect(validateSearch({ suscripcion: 'otra-cosa' })).toEqual({
            suscripcion: undefined,
        });
    });
});

describe('/ajustes', () => {
    it('opens the first tab', () => {
        expect(redirectOf({})).toMatchObject({ to: '/ajustes/apariencia' });
    });

    it('takes a checkout started before the tabs on to its tab, with the flag', () => {
        expect(redirectOf({ suscripcion: 'retorno' })).toMatchObject({
            to: '/ajustes/suscripcion',
            search: { suscripcion: 'retorno' },
        });
    });
});
