import type { Paginated } from '@/types/pagination';
import { z } from 'zod';

// A list page shows cards loaded page after page by default, and its
// paginated table under `?vista=tabla` (#306). An unknown value falls back to
// the cards instead of failing the page.
export const listViewSearchSchema = z
    .enum(['tabla'])
    .optional()
    .catch(undefined);

export type ListView = 'cards' | 'tabla';

export function listViewOf(vista: 'tabla' | undefined): ListView {
    return vista ?? 'cards';
}

// Fills whole rows of the one, two and three column grids.
export const CARDS_PAGE_SIZE = 12;

export function nextPageOf(lastPage: Paginated<unknown>): number | undefined {
    const { current_page, last_page } = lastPage.meta;

    return current_page < last_page ? current_page + 1 : undefined;
}

// A row created or deleted while the list is open shifts the later pages, so
// the same row can come back on the next one: it is kept once.
export function flattenPages<T extends { id: number }>(
    pages: Paginated<T>[],
): T[] {
    const seen = new Set<number>();

    return pages
        .flatMap((page) => page.data)
        .filter((item) => {
            if (seen.has(item.id)) {
                return false;
            }
            seen.add(item.id);

            return true;
        });
}
