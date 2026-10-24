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
