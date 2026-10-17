import { defaultParseSearch } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { Route } from '../registro';

// Cast narrows the union type back to the plain function this route passes.
const validateSearch = Route.options.validateSearch as (
    search: Record<string, unknown>,
) => { plan?: 'gratis' | 'consultorio'; pago?: 'mensual' | 'anual' };

describe('/registro validateSearch', () => {
    it('reads the plan a landing CTA links with', () => {
        expect(validateSearch(defaultParseSearch('?plan=consultorio'))).toEqual(
            { plan: 'consultorio' },
        );
        expect(validateSearch(defaultParseSearch('?plan=gratis'))).toEqual({
            plan: 'gratis',
        });
    });

    it('reads how a landing CTA chose to pay, dropping anything else', () => {
        expect(
            validateSearch(defaultParseSearch('?plan=consultorio&pago=anual')),
        ).toEqual({ plan: 'consultorio', pago: 'anual' });
        expect(validateSearch({ pago: 'mensual' })).toEqual({
            pago: 'mensual',
        });
        expect(validateSearch({ pago: 'annual' })).toEqual({});
    });

    it('parses a plain visit to no plan', () => {
        expect(validateSearch({})).toEqual({ plan: undefined });
    });

    it('drops a plan that is not self-serve instead of failing the page', () => {
        expect(validateSearch({ plan: 'centro' })).toEqual({ plan: undefined });
        expect(validateSearch({ plan: 'free' })).toEqual({ plan: undefined });
    });
});
