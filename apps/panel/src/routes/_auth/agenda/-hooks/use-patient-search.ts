import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { api } from '@/lib/api';
import type { Paginated } from '@/types/pagination';
import type { Patient } from '@/types/patient';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export const PATIENT_SEARCH_DEBOUNCE_MS = 300;

// Interaction-triggered read (ADR 0007's exception): the booking dialog's patient lookup.
export function usePatientSearch(enabled: boolean) {
    const [patientQuery, setPatientQuery] = useState('');
    const debouncedQuery = useDebouncedValue(
        patientQuery,
        PATIENT_SEARCH_DEBOUNCE_MS,
    );

    const { data: patientsPage, isPlaceholderData } = useQuery({
        queryKey: ['patients', 'booking', debouncedQuery],
        queryFn: () =>
            api
                .get<Paginated<Patient>>('/patients', {
                    params: { q: debouncedQuery || undefined, page: 1 },
                })
                .then((response) => response.data),
        enabled,
        // Keeps the list in place while the next search loads, instead of flashing empty.
        placeholderData: keepPreviousData,
    });

    const patients = patientsPage?.data ?? [];
    const emptySearch =
        debouncedQuery !== '' &&
        patientsPage !== undefined &&
        !isPlaceholderData &&
        patients.length === 0
            ? debouncedQuery
            : null;

    return { patientQuery, setPatientQuery, patients, emptySearch };
}
