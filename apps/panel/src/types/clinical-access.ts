import type { ClinicalAccessReason } from '@/lib/clinical-access';

// One row of `GET /exceptional-accesses`, the owner's list (#325): who opened
// which patient's history without an appointment near today, why and when.
// Never the professional's own words nor anything clinical.
export type ExceptionalAccess = {
    id: number;
    created_at: string;
    professional: {
        membership_id: number;
        name: string | null;
    };
    patient: {
        id: number;
        name: string | null;
    };
    reason: ClinicalAccessReason;
};
