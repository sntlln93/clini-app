import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { api } from '@/lib/api';
import type { MedicationProduct } from '@/types/medication';
import { useQuery } from '@tanstack/react-query';

// Mirror `SearchMedicationsRequest` in the API: a term outside them is a 422.
export const MEDICATION_SEARCH_MIN_LENGTH = 5;
export const MEDICATION_SEARCH_MAX_LENGTH = 100;
// The API answers at most this many; the form never shows more.
export const MEDICATION_SUGGESTIONS_LIMIT = 10;
export const MEDICATION_SEARCH_DEBOUNCE_MS = 300;

function searchable(term: string): boolean {
    return (
        term.length >= MEDICATION_SEARCH_MIN_LENGTH &&
        term.length <= MEDICATION_SEARCH_MAX_LENGTH
    );
}

type CatalogSearch<T> = {
    items: T[];
    isSearching: boolean;
    isSettled: boolean;
};

// Interaction-triggered read (ADR 0007 exception): what the medication
// catalog holds for what the professional typed, filled from the Buscador
// Nacional de Medicamentos when the catalog doesn't cover the term yet (#377).
// An empty term (a suggestion already picked) asks nothing.
function useCatalogSearch<T>(
    path: '/medications' | '/medication-substances',
    term: string,
): CatalogSearch<T> {
    const trimmed = term.trim();
    const debounced = useDebouncedValue(trimmed, MEDICATION_SEARCH_DEBOUNCE_MS);
    const enabled = searchable(debounced);
    const { data, isFetching } = useQuery({
        queryKey: [path.slice(1), 'search', debounced],
        queryFn: () =>
            api
                .get<{ data: T[] }>(path, { params: { q: debounced } })
                .then((response) => response.data.data),
        enabled,
        staleTime: 5 * 60 * 1000,
    });

    // The debounced term lags behind: once a suggestion is picked (an empty
    // term), the list goes away at once, and while it catches up with a new
    // term the previous term's suggestions aren't offered for it.
    const shown = enabled && searchable(trimmed);
    const current = shown && debounced === trimmed && data !== undefined;

    return {
        items: current ? data.slice(0, MEDICATION_SUGGESTIONS_LIMIT) : [],
        isSearching: shown && (isFetching || debounced !== trimmed),
        // A finished search for exactly what is typed, found or not.
        isSettled: current && !isFetching,
    };
}

// The catalog products whose name or drug contains the term. Each product
// comes whole, so picking one asks nothing else.
export type MedicationSearch = {
    products: MedicationProduct[];
    isSearching: boolean;
    isSettled: boolean;
};

export function useMedicationSearch(term: string): MedicationSearch {
    const { items, ...search } = useCatalogSearch<MedicationProduct>(
        '/medications',
        term,
    );

    return { products: items, ...search };
}

// The catalog's active substances that contain the term (#383), as the
// products name them: what an allergy is recorded with so the allergy warning
// finds it in a product picked from the catalog.
export type MedicationSubstanceSearch = {
    substances: string[];
    isSearching: boolean;
    isSettled: boolean;
};

export function useMedicationSubstanceSearch(
    term: string,
): MedicationSubstanceSearch {
    const { items, ...search } = useCatalogSearch<string>(
        '/medication-substances',
        term,
    );

    return { substances: items, ...search };
}
