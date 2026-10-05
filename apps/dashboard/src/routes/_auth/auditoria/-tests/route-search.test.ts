import { describe, expect, it } from 'vitest';
import { Route } from '../index';

type Search = Record<string, unknown>;

const validateSearch = Route.options.validateSearch as (
    search: Search,
) => Search;

describe('/auditoria validateSearch', () => {
    it('keeps a subject filter with both type and id', () => {
        expect(
            validateSearch({ subject_type: 'user', subject_id: 4 }),
        ).toMatchObject({
            subject_type: 'user',
            subject_id: 4,
        });
    });

    it('drops a subject_id without subject_type (the API would answer 422)', () => {
        expect(validateSearch({ subject_id: 4 }).subject_id).toBeUndefined();
    });

    it('drops an unknown action and a malformed date', () => {
        const search = validateSearch({
            action: 'users.delete',
            from: '04/10/2026',
        });

        expect(search.action).toBeUndefined();
        expect(search.from).toBeUndefined();
    });
});
