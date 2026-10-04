import { defaultParseSearch } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';
import { Route } from '../index';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

// Cast narrows the union type back to the plain function this route passes.
const validateSearch = Route.options.validateSearch as (
    search: Record<string, unknown>,
) => { suscripcion?: 'retorno' };

describe('/ajustes validateSearch', () => {
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
