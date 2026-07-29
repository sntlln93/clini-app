import type { Membership } from '@/types/membership';
import type {
    ProfessionalSpecialty,
    UserSpecialty,
} from '@/types/professional';
import { useCanManageProfessionalCatalog } from '../-hooks/use-catalog-permissions';
import { ProfessionalSpecialtyRow } from './ProfessionalSpecialtyRow';

type ProfessionalSpecialtiesSectionProps = {
    professionals: Membership[];
    credentialsByMembership: Record<number, UserSpecialty[]>;
    assignedByMembership: Record<number, ProfessionalSpecialty[]>;
};

export function ProfessionalSpecialtiesSection({
    professionals,
    credentialsByMembership,
    assignedByMembership,
}: ProfessionalSpecialtiesSectionProps) {
    const canManage = useCanManageProfessionalCatalog();

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">
                    Especialidades por profesional
                </h2>
                <p className="text-sm text-muted-foreground">
                    Asigná, para cada profesional, las especialidades con las
                    que atiende (solo entre las que tiene como credencial).
                </p>
            </div>

            {professionals.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Todavía no hay profesionales en esta organización.
                </p>
            )}

            {professionals.length > 0 && (
                <div className="space-y-3">
                    {professionals.map((membership) => (
                        <ProfessionalSpecialtyRow
                            key={membership.id}
                            membership={membership}
                            canManage={canManage(membership)}
                            credentials={
                                credentialsByMembership[membership.user.id] ??
                                []
                            }
                            assigned={assignedByMembership[membership.id] ?? []}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
