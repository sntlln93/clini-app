import type { Paginated } from '@/types/pagination';
import { describe, expect, it } from 'vitest';
import {
    flattenPages,
    listViewOf,
    listViewSearchSchema,
    nextPageOf,
} from './list-view';

function page<T>(
    data: T[],
    current_page: number,
    last_page: number,
): Paginated<T> {
    return {
        data,
        meta: { current_page, last_page, per_page: 24, total: 0 },
        links: { first: null, last: null, prev: null, next: null },
    };
}

describe('list view search', () => {
    it('keeps the table and falls back to the cards for anything else', () => {
        expect(listViewSearchSchema.parse('tabla')).toBe('tabla');
        expect(listViewSearchSchema.parse(undefined)).toBeUndefined();
        expect(listViewSearchSchema.parse('grilla')).toBeUndefined();
    });

    it('defaults to the cards', () => {
        expect(listViewOf(undefined)).toBe('cards');
        expect(listViewOf('tabla')).toBe('tabla');
    });
});

describe('nextPageOf', () => {
    it('asks for the following page until the last one', () => {
        expect(nextPageOf(page([], 1, 3))).toBe(2);
        expect(nextPageOf(page([], 3, 3))).toBeUndefined();
    });
});

describe('flattenPages', () => {
    it('joins the pages in order and keeps a row repeated by a shifted page once', () => {
        const rows = flattenPages([
            page([{ id: 1 }, { id: 2 }], 1, 2),
            page([{ id: 2 }, { id: 3 }], 2, 2),
        ]);

        expect(rows.map((row) => row.id)).toEqual([1, 2, 3]);
    });
});
