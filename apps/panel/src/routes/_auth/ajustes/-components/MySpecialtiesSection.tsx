import { ListSkeleton } from '@/components/ListSkeleton';
import { QueryErrorState } from '@/components/QueryErrorState';
import { Checkbox } from '@/components/ui/checkbox';
import { useSession } from '@/lib/session';
import { useCatalogSpecialties } from '../-hooks/use-catalog';
import {
    useToggleUserSpecialty,
    useUserSpecialties,
} from '../-hooks/use-user-specialties';

export function MySpecialtiesSection() {
    const { data: session } = useSession();
    const userId = session?.id ?? 0;

    const {
        data: specialties,
        isPending: isSpecialtiesPending,
        isError: isSpecialtiesError,
        error: specialtiesError,
    } = useCatalogSpecialties();
    const {
        data: mySpecialties,
        isPending: isMinePending,
        isError: isMineError,
        error: mineError,
    } = useUserSpecialties(userId);
    const { assign, remove } = useToggleUserSpecialty(userId);

    const isPending = isSpecialtiesPending || isMinePending;
    const isError = isSpecialtiesError || isMineError;

    function toggle(specialtyId: number, checked: boolean) {
        if (checked) {
            assign.mutate(specialtyId);
        } else {
            remove.mutate(specialtyId);
        }
    }

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Mis especialidades</h2>
                <p className="text-sm text-muted-foreground">
                    Marcá las especialidades para las que estás habilitado.
                </p>
            </div>

            {isError && (
                <QueryErrorState error={specialtiesError ?? mineError} />
            )}

            {!isError && isPending && <ListSkeleton />}

            {!isError &&
                !isPending &&
                specialties &&
                specialties.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Todavía no hay especialidades en el catálogo.
                    </p>
                )}

            {!isError && !isPending && specialties && mySpecialties && (
                <div className="space-y-1.5">
                    {specialties.map((specialty) => (
                        <label
                            key={specialty.id}
                            className="flex items-center gap-2 text-sm"
                        >
                            <Checkbox
                                checked={mySpecialties.some(
                                    (mine) =>
                                        mine.specialty_id === specialty.id,
                                )}
                                onCheckedChange={(checked) =>
                                    toggle(specialty.id, checked === true)
                                }
                            />
                            {specialty.name}
                        </label>
                    ))}
                </div>
            )}
        </section>
    );
}
