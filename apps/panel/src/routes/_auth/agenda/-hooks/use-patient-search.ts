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
    // A patient registered from the dialog: listed until the search catches up with it.
    const [pinnedPatient, setPinnedPatient] = useState<Patient | null>(null);
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

    const results = patientsPage?.data ?? [];
    const patients =
        pinnedPatient === null ||
        results.some((patient) => patient.id === pinnedPatient.id)
            ? results
            : [pinnedPatient, ...results];
    const emptySearch =
        debouncedQuery !== '' &&
        patientsPage !== undefined &&
        !isPlaceholderData &&
        patients.length === 0
            ? debouncedQuery
            : null;

    function resetSearch() {
        setPatientQuery('');
        setPinnedPatient(null);
    }

    // Searches by its document so the list narrows down to it.
    function pinPatient(patient: Patient) {
        setPinnedPatient(patient);
        setPatientQuery(patient.document_number);
    }

    return {
        patientQuery,
        setPatientQuery,
        patients,
        emptySearch,
        resetSearch,
        pinPatient,
    };
}
