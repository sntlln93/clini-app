import type { StatusTone } from '@/components/StatusPill';
import type {
    ProfessionalLicense,
    ProfessionalLicenseStatus,
} from '@/types/professional-license';

export const LICENSE_STATUS: Record<
    ProfessionalLicenseStatus,
    { label: string; tone: StatusTone }
> = {
    verified: { label: 'Verificada', tone: 'success' },
    mismatch: { label: 'No coincide', tone: 'danger' },
    unverified: { label: 'Sin verificar', tone: 'neutral' },
};

/** Why a license reads as it does, in the professional's words. */
export function licenseExplanation(
    license: ProfessionalLicense,
    hasDocument: boolean,
): string {
    if (license.status === 'verified') {
        return 'El Buscador Nacional de Profesionales de la Salud la muestra habilitada.';
    }

    if (license.status === 'unverified') {
        return hasDocument
            ? 'Todavía no la pudimos consultar en el Buscador Nacional de Profesionales de la Salud.'
            : 'Cargá tu DNI para validarla.';
    }

    switch (license.mismatch_reason) {
        case 'inactive':
            return 'El Buscador te muestra como profesional inactivo.';
        case 'sanctioned':
            return 'El Buscador muestra una sanción vigente sobre esta matrícula.';
        case 'not_enabled':
            return `El Buscador muestra la matrícula como «${license.situation ?? 'no habilitada'}».`;
        default:
            return 'El Buscador ya no muestra esta matrícula para tu DNI.';
    }
}
