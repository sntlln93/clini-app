import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { healthProfessionLabel } from '@/lib/health-professions';
import { provinceLabel } from '@/lib/provinces';
import type { ProfessionalLicense } from '@/types/professional-license';
import { useAddLicenseToClini } from '../-hooks/use-professional-licenses';
import { LICENSE_STATUS } from './professional-license-copy';

// A license the registry holds for the DNI that isn't in Clini yet (#387):
// the professional adds the ones that are theirs.
export function RegistryLicenseItem({
    license,
}: {
    license: ProfessionalLicense;
}) {
    const add = useAddLicenseToClini();
    const title = `${healthProfessionLabel(license.profession)} · ${provinceLabel(license.province)} · ${license.number}`;
    const details = [
        license.specialty && `Especialidad: ${license.specialty}`,
        license.status !== 'verified' && LICENSE_STATUS[license.status].label,
    ].filter(Boolean);

    return (
        <li className="flex flex-wrap items-center gap-3 rounded-2xl border p-4">
            <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-medium wrap-break-word">{title}</p>
                {details.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        {details.join(' · ')}
                    </p>
                )}
            </div>
            <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={add.isPending}
                aria-label={`Agregar a Clini la matrícula ${license.number}`}
                onClick={() => add.mutate(license.id)}
            >
                {add.isPending && <Spinner data-icon="inline-start" />}
                Agregar a Clini
            </Button>
        </li>
    );
}
