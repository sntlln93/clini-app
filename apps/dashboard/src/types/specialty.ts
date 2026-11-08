import type { HealthProfession } from '@/lib/health-professions';

/** Why the registry doesn't back a license (`App\Enums\ProfessionalLicenseMismatch`). */
export const LICENSE_MISMATCH_REASONS = [
    'not_found',
    'inactive',
    'sanctioned',
    'not_enabled',
] as const;
export type LicenseMismatchReason = (typeof LICENSE_MISMATCH_REASONS)[number];

/** Licenses professionals added to Clini, by what the registry last said. */
export type ProfessionLicenseCounts = {
    verified: number;
    unverified: number;
    mismatch: number;
    mismatch_reasons: Record<LicenseMismatchReason, number>;
};

/** A catalog row with platform-wide counts only (#418): never who. */
export type CatalogSpecialty = {
    id: number;
    name: string;
    /** The row of the profession the registry answers without a specialty. */
    without_specialty: boolean;
    /** Distinct professionals a verified license in Clini backs it for. */
    backed_professionals: number;
    /** Distinct professionals a practice offers it with, as its booking page lists them. */
    offering_professionals: number;
    offering_organizations: number;
    /** Of those offers, the ones marked «sin respaldo de matrícula». */
    unbacked_offers: number;
};

export type CatalogProfession = {
    profession: HealthProfession;
    licenses: ProfessionLicenseCounts;
    specialties: CatalogSpecialty[];
};

export type SpecialtyCatalogUsage = {
    professions: CatalogProfession[];
};
