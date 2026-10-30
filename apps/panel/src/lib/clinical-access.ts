import type { ClinicalAccessTrailEntry } from '@/types/clinical-access';
import { formatShortDateTime } from './datetime';
import type { ErrorCode } from './error-codes';

// The clinical access log (#325, ADR 0022): the reasons a professional gives to
// open a patient's history without an appointment near today. Mirrors
// `App\Enums\ClinicalAccessReason`.
export const CLINICAL_ACCESS_REASONS = [
    'preparing_consultation',
    'study_result',
    'emergency',
    'other',
] as const;

export type ClinicalAccessReason = (typeof CLINICAL_ACCESS_REASONS)[number];

export const CLINICAL_ACCESS_REASON_LABELS: Record<
    ClinicalAccessReason,
    string
> = {
    preparing_consultation: 'Preparar la consulta',
    study_result: 'Resultado de estudio',
    emergency: 'Urgencia',
    other: 'Otro',
};

// What a row of a patient's access trail records. Mirrors
// `App\Enums\ClinicalAccessAction`.
export const CLINICAL_ACCESS_ACTIONS = [
    'exceptional_access',
    'notes_viewed',
    'prescriptions_viewed',
    'note_written',
    'note_amended',
    'note_annulled',
    'prescription_issued',
    'prescription_amended',
    'prescription_annulled',
    'allergy_warning_shown',
    'allergy_warning_overridden',
    'vital_signs_viewed',
    'vital_sign_recorded',
    'vital_sign_amended',
    'vital_sign_annulled',
    'medical_history_viewed',
    'blood_type_recorded',
    'medical_history_recorded',
    'medical_history_amended',
    'medical_history_withdrawn',
    'record_exported',
    'access_code_issued',
    'access_code_sent',
    'access_code_resent',
    'access_code_redeemed',
] as const;

export type ClinicalAccessAction = (typeof CLINICAL_ACCESS_ACTIONS)[number];

// Shared by the patient page's trail and the access trail of the PDF the
// panel builds (`lib/clinical-record-pdf/`, ADR 0023).
export const CLINICAL_ACCESS_ACTION_LABELS: Record<
    ClinicalAccessAction,
    string
> = {
    exceptional_access: 'Acceso excepcional',
    notes_viewed: 'Leyó las notas clínicas',
    prescriptions_viewed: 'Leyó la medicación indicada',
    note_written: 'Escribió una nota',
    note_amended: 'Enmendó una nota',
    note_annulled: 'Anuló una nota',
    prescription_issued: 'Registró medicación indicada',
    prescription_amended: 'Enmendó medicación indicada',
    prescription_annulled: 'Anuló medicación indicada',
    allergy_warning_shown: 'Recibió un aviso de alergia al indicar medicación',
    allergy_warning_overridden: 'Indicó medicación pese a un aviso de alergia',
    vital_signs_viewed: 'Leyó las mediciones',
    vital_sign_recorded: 'Registró una medición',
    vital_sign_amended: 'Enmendó una medición',
    vital_sign_annulled: 'Anuló una medición',
    medical_history_viewed: 'Leyó los antecedentes',
    blood_type_recorded: 'Registró el grupo sanguíneo',
    medical_history_recorded: 'Registró un antecedente',
    medical_history_amended: 'Enmendó un antecedente',
    medical_history_withdrawn: 'Dio de baja un antecedente',
    record_exported: 'Exportó la historia clínica',
    access_code_issued: 'Se generó el código del paciente',
    access_code_sent: 'Se envió el código al paciente',
    access_code_resent: 'Reenvió el código al paciente',
    access_code_redeemed: 'Ingresó el código del paciente',
};

// `App\Support\ClinicalAccess::WINDOW_DAYS`: an own appointment this close to
// today opens the history without a reason. Change both together.
export const CLINICAL_ACCESS_WINDOW_DAYS = 7;

// `App\Support\ClinicalAccess::EXCEPTIONAL_ACCESS_MINUTES`: how long a reason
// keeps the history open. Change both together.
export const EXCEPTIONAL_ACCESS_MINUTES = 60;

// What a patient-wide read answers once the exceptional access ran out.
export const CLINICAL_ACCESS_EXPIRED: ErrorCode =
    'clinical_access.reason_required';

// The owner's list (`/accesos-excepcionales`), dropped when an exceptional
// access adds a row to it.
export const EXCEPTIONAL_ACCESSES_QUERY_KEY = ['exceptional-accesses'];

// What a row of a patient's access trail did, on their page and in the PDF:
// the action, then the listed reason, the appointment it touched or the
// export's format.
export function describeTrailEntry(entry: ClinicalAccessTrailEntry): string {
    const parts = [CLINICAL_ACCESS_ACTION_LABELS[entry.action]];

    if (entry.reason) {
        parts.push(`Motivo: ${CLINICAL_ACCESS_REASON_LABELS[entry.reason]}`);
    }

    if (entry.appointment) {
        parts.push(
            `Turno del ${formatShortDateTime(entry.appointment.start_at)}`,
        );
    }

    if (entry.export) {
        parts.push(
            entry.export.format.toUpperCase() +
                (entry.export.scope === 'attended_patients'
                    ? ', con todos sus pacientes atendidos'
                    : ''),
        );
    }

    return parts.join(' · ');
}
