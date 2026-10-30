import { mapToAppError } from '@/lib/api-errors';
import type { AllergySeverity } from '@/types/medical-history';

// An allergy the warning shows in full: one the professional reads.
export type WarnedAllergy = {
    id: number;
    // The version of the allergy that matched, which «Indicar igual» confirms.
    version_id: number;
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
    hiddenAllergyVersionIds: number[];
    reasonRequired: boolean;
};

// What «Indicar igual» sends back for each allergy: the version that matched,
// as it was shown. A newer version, or one now shown otherwise, warns again.
export type AllergyConfirmation = {
    version_id: number;
    detail_shown: boolean;
};

function isIdList(value: unknown): value is number[] {
    return Array.isArray(value) && value.every((id) => typeof id === 'number');
}

function isWarnedAllergy(value: unknown): value is WarnedAllergy {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const { id, version_id, description } = value as Record<string, unknown>;

    return (
        typeof id === 'number' &&
        typeof version_id === 'number' &&
        typeof description === 'string'
    );
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

    const { allergies, hidden_allergy_version_ids, reason_required } =
        appError.context;

    if (
        !Array.isArray(allergies) ||
        !allergies.every(isWarnedAllergy) ||
        !isIdList(hidden_allergy_version_ids)
    ) {
        return null;
    }

    return {
        allergies,
        hiddenAllergyVersionIds: hidden_allergy_version_ids,
        reasonRequired: reason_required === true,
    };
}

// What «Indicar igual» sends back: every allergy it warned about, as shown.
export function allergyConfirmations(
    warning: AllergyWarning,
): AllergyConfirmation[] {
    return [
        ...warning.allergies.map((allergy) => ({
            version_id: allergy.version_id,
            detail_shown: true,
        })),
        ...warning.hiddenAllergyVersionIds.map((versionId) => ({
            version_id: versionId,
            detail_shown: false,
        })),
    ];
}
