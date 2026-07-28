import { ListSkeleton } from '@/components/ListSkeleton';
import { QueryErrorState } from '@/components/QueryErrorState';
import { useProfessionals } from '@/hooks/use-professionals';
import { useCanManageProfessionalCatalog } from '../-hooks/use-catalog-permissions';
import { ProfessionalSpecialtyRow } from './ProfessionalSpecialtyRow';

export function ProfessionalSpecialtiesSection() {
    const {
        data: professionals,
        isPending,
        isError,
        error,
    } = useProfessionals();
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

            {isError && <QueryErrorState error={error} />}

            {!isError && isPending && <ListSkeleton />}

            {!isError &&
                !isPending &&
                professionals &&
                professionals.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Todavía no hay profesionales en esta organización.
                    </p>
                )}

            {!isError && !isPending && professionals && (
                <div className="space-y-3">
                    {professionals.map((membership) => (
                        <ProfessionalSpecialtyRow
                            key={membership.id}
                            membership={membership}
                            canManage={canManage(membership)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
