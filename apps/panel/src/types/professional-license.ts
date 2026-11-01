/** What the national registry last said about a license (#380). */
export type ProfessionalLicenseStatus = 'unverified' | 'verified' | 'mismatch';

export type ProfessionalLicenseMismatch =
    'not_found' | 'inactive' | 'sanctioned' | 'not_enabled';

/** A license as the professional declared it, with the registry's answer. */
export type ProfessionalLicense = {
    id: number;
    number: string;
    province: string;
    profession: string;
    status: ProfessionalLicenseStatus;
    mismatch_reason: ProfessionalLicenseMismatch | null;
    refeps_code: string | null;
    issuer: string | null;
    specialty: string | null;
    situation: string | null;
    checked_at: string | null;
};
