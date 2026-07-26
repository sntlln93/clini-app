import { api } from '@/lib/api';
import type { Paginated, Patient } from '@/types/patient';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

type UsePatientsParams = {
    q: string;
    page: number;
};

export function usePatients({ q, page }: UsePatientsParams) {
    return useQuery({
        queryKey: ['patients', { q, page }],
        queryFn: () =>
            api
                .get<Paginated<Patient>>('/patients', {
                    params: { q: q || undefined, page },
                })
                .then((response) => response.data),
        placeholderData: keepPreviousData,
    });
}
