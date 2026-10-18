import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { api } from '@/lib/api';
import type { Icd10Code } from '@/types/icd10-code';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

export const ICD10_SEARCH_DEBOUNCE_MS = 300;

/**
 * Interaction-triggered read (ADR 0007's exception): the diagnosis picker of
 * a clinical note (#324). The catalog has thousands of codes, so it is
 * searched as the professional types, never loaded whole.
 */
export function useIcd10CodeSearch(query: string) {
    const debouncedQuery = useDebouncedValue(
        query.trim(),
        ICD10_SEARCH_DEBOUNCE_MS,
    );

    const { data, isFetching, isPlaceholderData } = useQuery({
        queryKey: ['icd10-codes', debouncedQuery],
        queryFn: () =>
            api
                .get<{ data: Icd10Code[] }>('/icd10-codes', {
                    params: { q: debouncedQuery },
                })
                .then((response) => response.data.data),
        enabled: debouncedQuery !== '',
        placeholderData: keepPreviousData,
        // Reference data: it doesn't change while a note is being written.
        staleTime: 5 * 60 * 1000,
    });

    return {
        codes: debouncedQuery === '' ? [] : (data ?? []),
        isSearching: query.trim() !== debouncedQuery || isFetching,
        isEmpty:
            debouncedQuery !== '' &&
            data !== undefined &&
            !isPlaceholderData &&
            data.length === 0,
    };
}
