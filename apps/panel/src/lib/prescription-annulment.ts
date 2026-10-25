import type { PrescriptionAnnulmentKind } from '@/types/prescription';

// Why indicated medication no longer counts (#344), in the order the annul
// dialog offers them. Mirrors `App\Enums\PrescriptionAnnulmentKind`.
export const PRESCRIPTION_ANNULMENT_KINDS = [
    'no_longer_needed',
    'never_needed',
] as const satisfies readonly PrescriptionAnnulmentKind[];

// Shared by the history (agenda and patient page), the annul dialog and the
// PDF the panel builds (`lib/clinical-record-pdf/`, ADR 0023).
export const PRESCRIPTION_ANNULMENT_KIND_LABELS: Record<
    PrescriptionAnnulmentKind,
    string
> = {
    no_longer_needed: 'Ya no es necesaria',
    never_needed: 'Nunca fue necesaria',
};

export const PRESCRIPTION_ANNULMENT_KIND_DESCRIPTIONS: Record<
    PrescriptionAnnulmentKind,
    string
> = {
    no_longer_needed: 'El tratamiento terminó o se suspendió.',
    never_needed:
        'Se indicó por error, por ejemplo al paciente o en el turno equivocado.',
};
