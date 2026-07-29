import { api } from '@/lib/api';
import type { Patient } from '@/types/patient';
import { queryOptions } from '@tanstack/react-query';

export function patientQueryOptions(id: number) {
    return queryOptions({
        queryKey: ['patients', id],
        queryFn: () =>
            api
                .get<{ data: Patient }>(`/patients/${id}`)
                .then((response) => response.data.data),
    });
}
