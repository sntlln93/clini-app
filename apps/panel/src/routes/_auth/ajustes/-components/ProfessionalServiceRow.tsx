import type { Membership } from '@/types/membership';
import type { CatalogService } from '@/types/professional';
import { useProfessionalServices } from '../-hooks/use-professional-services';
import { ProfessionalServiceItem } from './ProfessionalServiceItem';

type ProfessionalServiceRowProps = {
    membership: Membership;
    services: CatalogService[];
    canManage: boolean;
};

export function ProfessionalServiceRow({
    membership,
    services,
    canManage,
}: ProfessionalServiceRowProps) {
    const { data: assigned, isPending } = useProfessionalServices(
        membership.id,
    );

    return (
        <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">
                {membership.user.name ?? membership.user.email}
            </p>

            {isPending && (
                <p className="text-sm text-muted-foreground">Cargando…</p>
            )}

            {!isPending && assigned && (
                <div className="space-y-2">
                    {services.map((service) => (
                        <ProfessionalServiceItem
                            key={service.id}
                            membershipId={membership.id}
                            service={service}
                            assignment={
                                assigned.find(
                                    (item) => item.service_id === service.id,
                                ) ?? null
                            }
                            canManage={canManage}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
