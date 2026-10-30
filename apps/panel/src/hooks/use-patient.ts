import { api } from '@/lib/api';
import type { PatientDetail } from '@/types/patient';
import { queryOptions } from '@tanstack/react-query';

export function patientQueryOptions(id: number) {
    return queryOptions({
        queryKey: ['patients', id],
        queryFn: () =>
            api
                .get<{ data: PatientDetail }>(`/patients/${id}`)
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

// Under the patient's key, so dropping the patient drops its trail too.
export function patientClinicalAccessQueryKey(patientId: number) {
    return ['patients', patientId, 'clinical-access'];
}

export function patientPrescriptionsQueryKey(patientId: number) {
    return ['prescriptions', 'patient', patientId];
}

// The measurements and the background (#361), both read only by the patient
// page's loader, under the patient's key.
export function patientVitalSignsQueryKey(patientId: number) {
    return ['patients', patientId, 'vital-signs'];
}

export function patientMedicalHistoryQueryKey(patientId: number) {
    return ['patients', patientId, 'medical-history'];
}
