import { mapToAppError } from '@/lib/api-errors';
import type { AllergySeverity } from '@/types/medical-history';

// An allergy the warning shows in full: one the professional reads.
export type WarnedAllergy = {
    id: number;
    description: string;
    reaction: string | null;
    severity: AllergySeverity | null;
};

// `prescriptions.allergy_warning` (#362): the current allergies the medication
// matched. A hidden one is another author's the patient hasn't opened with
// their code, or any while the history takes an exceptional access
// (`reasonRequired`): the warning says there is one, not which.
export type AllergyWarning = {
    allergies: WarnedAllergy[];
    hiddenAllergyIds: number[];
    reasonRequired: boolean;
};

function isIdList(value: unknown): value is number[] {
    return Array.isArray(value) && value.every((id) => typeof id === 'number');
}

function isWarnedAllergy(value: unknown): value is WarnedAllergy {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const { id, description } = value as Record<string, unknown>;

    return typeof id === 'number' && typeof description === 'string';
}

// Narrows a mutation error into the warning; `null` for any other error, so
// the form falls through to its regular error handling.
export function readAllergyWarning(error: unknown): AllergyWarning | null {
    const appError = mapToAppError(error);

    if (
        appError.kind !== 'business' ||
        appError.code !== 'prescriptions.allergy_warning'
    ) {
        return null;
    }

    const { allergies, hidden_allergy_ids, reason_required } = appError.context;

    if (
        !Array.isArray(allergies) ||
        !allergies.every(isWarnedAllergy) ||
        !isIdList(hidden_allergy_ids)
    ) {
        return null;
    }

    return {
        allergies,
        hiddenAllergyIds: hidden_allergy_ids,
        reasonRequired: reason_required === true,
    };
}

// What «Indicar igual» sends back: every allergy it warned about.
export function warnedAllergyIds(warning: AllergyWarning): number[] {
    return [
        ...warning.allergies.map((allergy) => allergy.id),
        ...warning.hiddenAllergyIds,
    ];
}
