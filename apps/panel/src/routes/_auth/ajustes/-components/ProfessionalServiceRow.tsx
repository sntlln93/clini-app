import type { Membership } from '@/types/membership';
import type { CatalogService, ProfessionalService } from '@/types/professional';
import { ProfessionalServiceItem } from './ProfessionalServiceItem';

type ProfessionalServiceRowProps = {
    membership: Membership;
    services: CatalogService[];
    canManage: boolean;
    assigned: ProfessionalService[];
};

export function ProfessionalServiceRow({
    membership,
    services,
    canManage,
    assigned,
}: ProfessionalServiceRowProps) {
    return (
        <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">
                {membership.user.name ?? membership.user.email}
            </p>

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
        </div>
    );
}
