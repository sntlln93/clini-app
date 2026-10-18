import type { ClinicalNote } from '@/types/clinical-note';

/** Shared note fixture: one version whose text is `body`, unless `versions` says otherwise. */
export function buildClinicalNote(
    overrides: Partial<ClinicalNote> = {},
): ClinicalNote {
    const body = overrides.body ?? 'Nota original.';
    const createdAt = overrides.created_at ?? '2026-08-03T09:00:00Z';

    return {
        id: 1,
        appointment_id: 42,
        membership_id: 1,
        body,
        version: 1,
        created_at: createdAt,
        amended_at: null,
        annulment: null,
        versions: [{ version: 1, body, reason: null, created_at: createdAt }],
        ...overrides,
    };
}
