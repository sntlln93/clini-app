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

// Keys of the patient page's loader-only reads, shared so the agenda's
// mutations can refresh them too (#273).
export function patientAppointmentsQueryKey(patientId: number) {
    return ['patients', patientId, 'appointments'];
}

export function patientClinicalNotesQueryKey(patientId: number) {
    return ['patients', patientId, 'clinical-notes'];
}
