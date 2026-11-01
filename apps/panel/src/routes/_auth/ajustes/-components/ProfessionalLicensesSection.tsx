import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { provinceLabel } from '@/lib/provinces';
import type { ProfessionalLicense } from '@/types/professional-license';
import { useVerifyProfessionalLicenses } from '../-hooks/use-professional-licenses';
import { AddProfessionalLicenseForm } from './AddProfessionalLicenseForm';
import { ProfessionalLicenseItem } from './ProfessionalLicenseItem';
import { RegistryProgress } from './RegistryProgress';

type ProfessionalLicensesSectionProps = {
    licenses: ProfessionalLicense[];
    hasDocument: boolean;
    /** The practice's declared province, null until its owner declares it. */
    organizationProvince: string | null;
};

// The professional's licenses (#380), each with what the national registry
// last said about it. Nothing in the panel waits on a verification.
export function ProfessionalLicensesSection({
    licenses,
    hasDocument,
    organizationProvince,
}: ProfessionalLicensesSectionProps) {
    const verify = useVerifyProfessionalLicenses();

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Mis matrículas</h2>
                <p className="text-sm text-muted-foreground">
                    Cargá cada matrícula con su provincia y profesión y la
                    validamos en el Buscador Nacional de Profesionales de la
                    Salud.{' '}
                    {organizationProvince
                        ? `En este consultorio vale la de ${provinceLabel(organizationProvince)}.`
                        : 'El consultorio todavía no declaró su provincia: quien lo administra la carga en Ajustes › Consultorio.'}
                </p>
            </div>

            {licenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Todavía no cargaste matrículas.
                </p>
            ) : (
                <ul className="space-y-2">
                    {licenses.map((license) => (
                        <ProfessionalLicenseItem
                            key={license.id}
                            license={license}
                            hasDocument={hasDocument}
                            countsHere={
                                organizationProvince !== null &&
                                license.province === organizationProvince
                            }
                        />
                    ))}
                </ul>
            )}

            {hasDocument && licenses.length > 0 && (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={verify.isPending}
                    onClick={() => verify.mutate()}
                >
                    {verify.isPending && <Spinner data-icon="inline-start" />}
                    {verify.isPending ? 'Consultando…' : 'Volver a consultar'}
                </Button>
            )}
            {verify.isPending && <RegistryProgress />}

            <AddProfessionalLicenseForm
                defaultProvince={organizationProvince}
            />
        </section>
    );
}
