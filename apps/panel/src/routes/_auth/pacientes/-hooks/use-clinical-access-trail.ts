import { patientClinicalAccessQueryKey } from '@/hooks/use-patient';
import { api } from '@/lib/api';
import { CLINICAL_ACCESS_EXPIRED } from '@/lib/clinical-access';
import type { ClinicalAccessTrailEntry } from '@/types/clinical-access';
import type { Paginated } from '@/types/pagination';
import { queryOptions, type QueryClient } from '@tanstack/react-query';

export function clinicalAccessTrailQueryOptions(
    patientId: number,
    page: number,
) {
    return queryOptions({
        queryKey: [...patientClinicalAccessQueryKey(patientId), { page }],
        queryFn: () =>
            api
                .get<Paginated<ClinicalAccessTrailEntry>>(
                    `/patients/${patientId}/clinical-access-logs`,
                    { params: { page } },
                )
                .then((response) => response.data),
        // Same as the notes: `loadClinicalHistory` asks for the reason again.
        meta: { expectedBusinessCodes: [CLINICAL_ACCESS_EXPIRED] },
    });
}

/**
 * Page read (ADR 0007) of the patient's access trail (#325). Every read of the
 * history adds to it, the agenda's and this very page's included, so it is
 * fetched fresh on every load instead of being dropped by each of them.
 */
export function loadClinicalAccessTrail(
    queryClient: QueryClient,
    patientId: number,
    page: number,
): Promise<Paginated<ClinicalAccessTrailEntry>> {
    return queryClient.fetchQuery({
        ...clinicalAccessTrailQueryOptions(patientId, page),
        staleTime: 0,
    });
}
