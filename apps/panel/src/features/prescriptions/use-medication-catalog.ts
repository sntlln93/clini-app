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

// Interaction-triggered read (ADR 0007 exception): the catalog products whose
// name or drug contains what the professional typed, filled from the Buscador
// Nacional de Medicamentos when the catalog doesn't cover the term yet (#377).
// Each product comes whole, so picking one asks nothing else. An empty term
// (a product already picked) asks nothing.
export type MedicationSearch = {
    products: MedicationProduct[];
    isSearching: boolean;
    isSettled: boolean;
};

export function useMedicationSearch(term: string): MedicationSearch {
    const trimmed = term.trim();
    const debounced = useDebouncedValue(trimmed, MEDICATION_SEARCH_DEBOUNCE_MS);
    const enabled = searchable(debounced);
    const { data, isFetching } = useQuery({
        queryKey: ['medications', 'search', debounced],
        queryFn: () =>
            api
                .get<{ data: MedicationProduct[] }>('/medications', {
                    params: { q: debounced },
                })
                .then((response) => response.data.data),
        enabled,
        staleTime: 5 * 60 * 1000,
    });

    // The debounced term lags behind: once a product is picked (an empty
    // term), its suggestions go away at once, and while it catches up with a
    // new term the previous term's products aren't offered for it.
    const shown = enabled && searchable(trimmed);
    const current = shown && debounced === trimmed && data !== undefined;

    return {
        products: current ? data.slice(0, MEDICATION_SUGGESTIONS_LIMIT) : [],
        isSearching: shown && (isFetching || debounced !== trimmed),
        // A finished search for exactly what is typed, found or not.
        isSettled: current && !isFetching,
    };
}
