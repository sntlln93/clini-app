import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { api } from '@/lib/api';
import type { MedicationProduct } from '@/types/medication';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

// Mirrors `SearchMedicationsRequest::MIN_TERM_LENGTH` in the API.
export const MEDICATION_SEARCH_MIN_LENGTH = 5;
export const MEDICATION_SEARCH_DEBOUNCE_MS = 300;

// Interaction-triggered read (ADR 0007 exception): the catalog products whose
// name contains what the professional typed, filled from the national
// vademecum when the catalog doesn't hold them yet (#377). An empty term
// (a product already picked) asks nothing.
export function useMedicationSearch(term: string) {
    const debounced = useDebouncedValue(
        term.trim(),
        MEDICATION_SEARCH_DEBOUNCE_MS,
    );
    const enabled = debounced.length >= MEDICATION_SEARCH_MIN_LENGTH;
    const { data, isFetching } = useQuery({
        queryKey: ['medications', 'search', debounced],
        queryFn: () =>
            api
                .get<{ data: MedicationProduct[] }>('/medications', {
                    params: { q: debounced },
                })
                .then((response) => response.data.data),
        enabled,
        placeholderData: keepPreviousData,
        staleTime: 5 * 60 * 1000,
    });

    // The debounced term lags behind: once a product is picked (an empty
    // term), its suggestions go away at once.
    const shown = enabled && term.trim().length >= MEDICATION_SEARCH_MIN_LENGTH;

    return {
        products: shown ? (data ?? []) : [],
        isSearching: shown && isFetching,
    };
}

// The picked product with its active ingredients, which the API asks the
// national vademecum for once per product.
export function useMedicationDetail(gtin: string) {
    return useQuery({
        queryKey: ['medications', 'detail', gtin],
        queryFn: () =>
            api
                .get<{ data: MedicationProduct }>(`/medications/${gtin}`)
                .then((response) => response.data.data),
        enabled: gtin !== '',
        staleTime: Infinity,
    });
}
