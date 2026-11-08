/** What the national registry last said about a license (#380). */
export type ProfessionalLicenseStatus = 'unverified' | 'verified' | 'mismatch';

export type ProfessionalLicenseMismatch =
    'not_found' | 'inactive' | 'sanctioned' | 'not_enabled';

/**
 * A license the registry holds for the professional's DNI, with its answer.
 * `added`: in Clini; otherwise only offered, and it backs nothing (#387).
 */
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
    added: boolean;
};

/**
 * The professional's DNI (#380): loaded once, after which only support changes
 * it (#417), and whether the registry found anyone under it (#387).
 */
export type ProfessionalDocument = {
    document_number: string | null;
    registry: 'unchecked' | 'found' | 'not_found';
};
