import type {
    AllergySeverity,
    MedicalHistory,
    MedicalHistoryCategory,
    MedicalHistoryEntry,
} from '@/types/medical-history';

export const CATEGORY_LABELS: Record<MedicalHistoryCategory, string> = {
    allergy: 'Alergia',
    personal: 'Antecedente personal',
    family: 'Antecedente familiar',
    surgical: 'Antecedente quirúrgico',
};

// The page's sections, one per category.
export const CATEGORY_SECTIONS: Record<MedicalHistoryCategory, string> = {
    allergy: 'Alergias',
    personal: 'Antecedentes personales',
    family: 'Antecedentes familiares',
    surgical: 'Antecedentes quirúrgicos',
};

export const SEVERITY_LABELS: Record<AllergySeverity, string> = {
    mild: 'Leve',
    moderate: 'Moderada',
    severe: 'Grave',
};

// The newest record is the current blood type (ADR 0027).
export function currentBloodType(history: MedicalHistory) {
    return history.blood_types[0] ?? null;
}

// Current ones first, then the withdrawn, each newest first as they came.
export function entriesOf(
    history: MedicalHistory,
    category: MedicalHistoryCategory,
): MedicalHistoryEntry[] {
    const entries = history.entries.filter(
        (entry) => entry.category === category,
    );

    return [
        ...entries.filter((entry) => entry.withdrawal === null),
        ...entries.filter((entry) => entry.withdrawal !== null),
    ];
}

// «Urticaria · Grave · 2015»: what an entry says besides its description.
export function entryDetails(entry: {
    reaction: string | null;
    severity: AllergySeverity | null;
    approximate_date: string | null;
}): string {
    return [
        entry.reaction,
        entry.severity &&
            `Severidad ${SEVERITY_LABELS[entry.severity].toLowerCase()}`,
        entry.approximate_date,
    ]
        .filter(Boolean)
        .join(' · ');
}
