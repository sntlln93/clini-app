import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { provinceLabel } from '@/lib/provinces';
import type { ProfessionalLicense } from '@/types/professional-license';
import { useVerifyProfessionalLicenses } from '../-hooks/use-professional-licenses';
import { ProfessionalLicenseItem } from './ProfessionalLicenseItem';
import { RegistryLicenseItem } from './RegistryLicenseItem';
import { RegistryProgress } from './RegistryProgress';

type ProfessionalLicensesSectionProps = {
    licenses: ProfessionalLicense[];
    hasDocument: boolean;
    /** The practice's declared province, null until its owner declares it. */
    organizationProvince: string | null;
};

// The professional's licenses (#380), all of them from the national registry
// (#387): the ones in Clini, checked again on each lookup, and the rest of
// what it holds for the DNI, to add. Nothing in the panel waits on a lookup.
export function ProfessionalLicensesSection({
    licenses,
    hasDocument,
    organizationProvince,
}: ProfessionalLicensesSectionProps) {
    const verify = useVerifyProfessionalLicenses();
    const added = licenses.filter((license) => license.added);
    const offered = licenses.filter((license) => !license.added);

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Mis matrículas</h2>
                <p className="text-sm text-muted-foreground">
                    Salen del Buscador Nacional de Profesionales de la Salud:
                    agregá a Clini las tuyas. Tu profesión y tu especialidad
                    salen de ahí: con las de tus matrículas verificadas, el
                    consultorio elige con cuáles atendés.{' '}
                    {organizationProvince
                        ? `En este consultorio vale la de ${provinceLabel(organizationProvince)}.`
                        : 'El consultorio todavía no declaró su provincia: quien lo administra la carga en Ajustes › Consultorio.'}
                </p>
            </div>

            {added.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {hasDocument
                        ? 'Todavía no agregaste matrículas a Clini.'
                        : 'Cargá tu DNI para traer tus matrículas.'}
                </p>
            ) : (
                <ul className="space-y-2">
                    {added.map((license) => (
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

            {offered.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium">
                        En el Buscador para tu DNI
                    </h3>
                    <ul className="space-y-2">
                        {offered.map((license) => (
                            <RegistryLicenseItem
                                key={license.id}
                                license={license}
                            />
                        ))}
                    </ul>
                </div>
            )}

            {hasDocument && (
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
        </section>
    );
}
