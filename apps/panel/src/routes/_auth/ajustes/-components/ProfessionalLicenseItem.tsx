import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusPill } from '@/components/StatusPill';
import { Button } from '@/components/ui/button';
import { formatDayMonthYear, fromInstant } from '@/lib/datetime';
import { healthProfessionLabel } from '@/lib/health-professions';
import { formatLicenseIssuer } from '@/lib/license-issuer';
import { provinceLabel } from '@/lib/provinces';
import type { ProfessionalLicense } from '@/types/professional-license';
import { Trash2 } from 'lucide-react';
import { useRemoveProfessionalLicense } from '../-hooks/use-professional-licenses';
import {
    LICENSE_STATUS,
    licenseExplanation,
} from './professional-license-copy';

type ProfessionalLicenseItemProps = {
    license: ProfessionalLicense;
    hasDocument: boolean;
    /** It is from the practice's province: the one that counts here. */
    countsHere: boolean;
};

export function ProfessionalLicenseItem({
    license,
    hasDocument,
    countsHere,
}: ProfessionalLicenseItemProps) {
    const remove = useRemoveProfessionalLicense();
    const status = LICENSE_STATUS[license.status];
    const title = `${healthProfessionLabel(license.profession)} · ${provinceLabel(license.province)} · ${license.number}`;
    const registryDetails = [
        license.issuer &&
            `Entidad emisora: ${formatLicenseIssuer(license.issuer)}`,
        license.specialty && `Especialidad: ${license.specialty}`,
        license.refeps_code && `Código REFEPS ${license.refeps_code}`,
        license.checked_at &&
            `Consultada el ${formatDayMonthYear(fromInstant(license.checked_at))}`,
    ].filter(Boolean);

    return (
        <li className="space-y-1.5 rounded-2xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 text-sm font-medium wrap-break-word">
                    {title}
                </span>
                <StatusPill tone={status.tone}>{status.label}</StatusPill>
                {countsHere && (
                    <StatusPill tone="info">
                        Vale en este consultorio
                    </StatusPill>
                )}
                <ConfirmDialog
                    trigger={
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="ml-auto"
                            aria-label={`Quitar la matrícula ${license.number}`}
                        >
                            <Trash2 />
                        </Button>
                    }
                    title="Quitar matrícula"
                    description="¿Quitar esta matrícula de tu perfil? Podés volver a cargarla cuando quieras."
                    confirmLabel="Quitar"
                    onConfirm={() => remove.mutate(license.id)}
                    isPending={remove.isPending}
                />
            </div>
            <p className="text-sm text-muted-foreground">
                {licenseExplanation(license, hasDocument)}
            </p>
            {registryDetails.length > 0 && (
                <p className="text-xs text-muted-foreground">
                    {registryDetails.join(' · ')}
                </p>
            )}
        </li>
    );
}
