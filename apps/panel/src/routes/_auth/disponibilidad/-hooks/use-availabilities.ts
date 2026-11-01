import { useRefreshPageData } from '@/hooks/use-refresh-page-data';
import { api } from '@/lib/api';
import { discardPageData } from '@/lib/page-data';
import { notifySuccess } from '@/lib/toast';
import type { Availability } from '@/types/availability';
import {
    queryOptions,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import type { SlotPayload } from '../-components/week-draft';

function queryKey(membershipId: number) {
    return ['availabilities', membershipId];
}

export function availabilitiesQueryOptions(membershipId: number) {
    return queryOptions({
        queryKey: queryKey(membershipId),
        queryFn: () =>
            api
                .get<{ data: Availability[] }>(
                    `/memberships/${membershipId}/availabilities`,
                )
                .then((response) => response.data.data),
    });
}

/** Saves the whole week at once; the API replaces every franja of the membership. */
export function useReplaceWeeklyAvailability(membershipId: number) {
    const refreshPageData = useRefreshPageData();
    const queryClient = useQueryClient();

    // Errors stay on the mutation for the page to show next to the save bar.
    return useMutation({
        mutationFn: (slots: SlotPayload[]) =>
            api.put(`/memberships/${membershipId}/availabilities`, { slots }),
        onSuccess: () => {
            // The reports' occupancy is computed from the published hours,
            // and the reports page reads them only in its loader (#273).
            discardPageData(queryClient, ['reports']);
            return refreshPageData(queryKey(membershipId)).then(() =>
                notifySuccess('Horarios guardados'),
            );
        },
    });
}
