import { api } from '@/lib/api';
import type { Patient } from '@/types/patient';
import { useQuery } from '@tanstack/react-query';

export function usePatient(id: number) {
    return useQuery({
        queryKey: ['patients', id],
        queryFn: () =>
            api
                .get<{ data: Patient }>(`/patients/${id}`)
                .then((response) => response.data.data),
        enabled: Number.isFinite(id),
    });
}
