import type { Membership } from '@/types/membership';
import type { CatalogService, ProfessionalService } from '@/types/professional';
import { useCanManageProfessionalCatalog } from '../-hooks/use-catalog-permissions';
import { ProfessionalServiceRow } from './ProfessionalServiceRow';

type ProfessionalServicesSectionProps = {
    professionals: Membership[];
    services: CatalogService[];
    assignedByMembership: Record<number, ProfessionalService[]>;
};

export function ProfessionalServicesSection({
    professionals,
    services,
    assignedByMembership,
}: ProfessionalServicesSectionProps) {
    const canManage = useCanManageProfessionalCatalog();

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

            {professionals.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Todavía no hay profesionales en esta organización.
                </p>
            )}

            {professionals.length > 0 && services.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Todavía no hay servicios en el catálogo.
                </p>
            )}

            {professionals.length > 0 && services.length > 0 && (
                <div className="space-y-3">
                    {professionals.map((membership) => (
                        <ProfessionalServiceRow
                            key={membership.id}
                            membership={membership}
                            services={services}
                            canManage={canManage(membership)}
                            assigned={assignedByMembership[membership.id] ?? []}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
