import { ListSkeleton } from '@/components/ListSkeleton';
import { QueryErrorState } from '@/components/QueryErrorState';
import { useProfessionals } from '@/hooks/use-professionals';
import { useCatalogServices } from '../-hooks/use-catalog';
import { useCanManageProfessionalCatalog } from '../-hooks/use-catalog-permissions';
import { ProfessionalServiceRow } from './ProfessionalServiceRow';

export function ProfessionalServicesSection() {
    const {
        data: professionals,
        isPending: isProfessionalsPending,
        isError: isProfessionalsError,
        error: professionalsError,
    } = useProfessionals();
    const {
        data: services,
        isPending: isServicesPending,
        isError: isServicesError,
        error: servicesError,
    } = useCatalogServices();
    const canManage = useCanManageProfessionalCatalog();

    const isPending = isProfessionalsPending || isServicesPending;
    const isError = isProfessionalsError || isServicesError;

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">
                    Servicios por profesional
                </h2>
                <p className="text-sm text-muted-foreground">
                    Asigná los servicios del catálogo que cada profesional
                    ofrece, con su duración y precio.
                </p>
            </div>

            {isError && (
                <QueryErrorState error={professionalsError ?? servicesError} />
            )}

            {!isError && isPending && <ListSkeleton />}

            {!isError &&
                !isPending &&
                professionals &&
                professionals.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Todavía no hay profesionales en esta organización.
                    </p>
                )}

            {!isError &&
                !isPending &&
                professionals &&
                professionals.length > 0 &&
                services &&
                services.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Todavía no hay servicios en el catálogo.
                    </p>
                )}

            {!isError && !isPending && professionals && services && (
                <div className="space-y-3">
                    {professionals.map((membership) => (
                        <ProfessionalServiceRow
                            key={membership.id}
                            membership={membership}
                            services={services}
                            canManage={canManage(membership)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
