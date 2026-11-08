import { NoProfessionalsEmptyState } from '@/features/NoProfessionalsEmptyState';
import type { Membership } from '@/types/membership';
import type { ProfessionalSpecialty, Specialty } from '@/types/professional';
import { useCanManageProfessionalCatalog } from '../-hooks/use-catalog-permissions';
import { ProfessionalSpecialtyRow } from './ProfessionalSpecialtyRow';

type ProfessionalSpecialtiesSectionProps = {
    professionals: Membership[];
    backedByMembership: Record<number, Specialty[]>;
    assignedByMembership: Record<number, ProfessionalSpecialty[]>;
};

export function ProfessionalSpecialtiesSection({
    professionals,
    backedByMembership,
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
                    Elegí, para cada profesional, con qué especialidades atiende
                    en este consultorio. Solo se pueden elegir las que respalda
                    una matrícula verificada en el Buscador Nacional de
                    Profesionales de la Salud.
                </p>
            </div>

            {professionals.length === 0 && (
                <NoProfessionalsEmptyState
                    description="Invitá a un profesional para asignarle sus especialidades."
                    size="section"
                />
            )}

            {professionals.length > 0 && (
                <div className="space-y-3">
                    {professionals.map((membership) => (
                        <ProfessionalSpecialtyRow
                            key={membership.id}
                            membership={membership}
                            canManage={canManage(membership)}
                            backed={backedByMembership[membership.id] ?? []}
                            assigned={assignedByMembership[membership.id] ?? []}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
