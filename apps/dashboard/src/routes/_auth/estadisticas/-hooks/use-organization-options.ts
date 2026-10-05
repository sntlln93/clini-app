import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { api } from '@/lib/api';
import type { AdminOrganization } from '@/types/organization';
import type { Paginated } from '@/types/pagination';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

export const ORGANIZATION_SEARCH_DEBOUNCE_MS = 300;
const OPTIONS_LIMIT = 20;

/**
 * Interaction-triggered read (ADR 0007's exception): the Stats organization
 * picker. There is no "all organizations" endpoint and the list caps at 100
 * per page, so it searches as the operator types instead of a static select.
 */
export function useOrganizationOptions(query: string) {
    const debouncedQuery = useDebouncedValue(
        query.trim(),
        ORGANIZATION_SEARCH_DEBOUNCE_MS,
    );

    const { data, isFetching, isPlaceholderData } = useQuery({
        queryKey: ['organizations', 'options', debouncedQuery],
        queryFn: () =>
            api
                .get<Paginated<AdminOrganization>>('/admin/organizations', {
                    params: { q: debouncedQuery, per_page: OPTIONS_LIMIT },
                })
                .then((response) => response.data.data),
        enabled: debouncedQuery !== '',
        placeholderData: keepPreviousData,
    });

    return {
        debouncedQuery,
        options: debouncedQuery === '' ? [] : (data ?? []),
        isSearching: isFetching,
        isEmpty:
            debouncedQuery !== '' &&
            data !== undefined &&
            !isPlaceholderData &&
            data.length === 0,
    };
}
