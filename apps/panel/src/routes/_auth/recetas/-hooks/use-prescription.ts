import { api } from '@/lib/api';
import type { Prescription } from '@/types/prescription';
import { queryOptions } from '@tanstack/react-query';

// Page read (ADR 0007): consumed from the `recetas/$id` route loader only.
// Under the `prescriptions` prefix so saving a prescription refetches it
// (`useSavePrescription` invalidates with `refetchType: 'all'`).
export function prescriptionQueryOptions(id: number) {
    return queryOptions({
        queryKey: ['prescriptions', 'detail', id],
        queryFn: () =>
            api
                .get<{ data: Prescription }>(`/prescriptions/${id}`)
                .then((response) => response.data.data),
    });
}
