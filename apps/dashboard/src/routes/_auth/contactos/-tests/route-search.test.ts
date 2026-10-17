import { describe, expect, it } from 'vitest';
import { Route } from '../index';

type Search = Record<string, unknown>;

const validateSearch = Route.options.validateSearch as (
    search: Search,
) => Search;

describe('/contactos validateSearch', () => {
    it('keeps a known status and page', () => {
        expect(validateSearch({ status: 'in_progress', page: 2 })).toEqual({
            status: 'in_progress',
            page: 2,
        });
    });

    it('drops an unknown status and a bad page (the API would answer 422)', () => {
        expect(validateSearch({ status: 'archived', page: 0 })).toEqual({
            status: undefined,
            page: undefined,
        });
    });
});
