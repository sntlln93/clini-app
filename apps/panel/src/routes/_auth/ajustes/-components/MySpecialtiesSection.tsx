import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { CatalogSpecialty, UserSpecialty } from '@/types/professional';
import { useId, useState } from 'react';
import { useToggleUserSpecialty } from '../-hooks/use-user-specialties';

type MySpecialtiesSectionProps = {
    userId: number;
    specialties: CatalogSpecialty[];
    mySpecialties: UserSpecialty[];
};

export function MySpecialtiesSection({
    userId,
    specialties,
    mySpecialties,
}: MySpecialtiesSectionProps) {
    const checkboxIdPrefix = useId();
    const { assign, remove } = useToggleUserSpecialty(userId);
    const [confirmingId, setConfirmingId] = useState<number | null>(null);

    function toggle(specialtyId: number, checked: boolean) {
        if (checked) {
            assign.mutate(specialtyId);
        } else {
            setConfirmingId(specialtyId);
        }
    }

    function handleConfirmRemove() {
        if (confirmingId !== null) {
            remove.mutate(confirmingId);
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

            {specialties.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Todavía no hay especialidades en el catálogo.
                </p>
            )}

            {specialties.length > 0 && (
                <div className="space-y-1.5">
                    {specialties.map((specialty) => {
                        const checkboxId = `${checkboxIdPrefix}-${specialty.id}`;
                        return (
                            <div
                                key={specialty.id}
                                className="flex items-center gap-2 text-sm"
                            >
                                <Checkbox
                                    id={checkboxId}
                                    checked={mySpecialties.some(
                                        (mine) =>
                                            mine.specialty_id === specialty.id,
                                    )}
                                    onCheckedChange={(checked) =>
                                        toggle(specialty.id, checked === true)
                                    }
                                />
                                <Label htmlFor={checkboxId}>
                                    {specialty.name}
                                </Label>
                            </div>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                open={confirmingId !== null}
                onOpenChange={(open) => !open && setConfirmingId(null)}
                title="Quitar especialidad"
                description="¿Quitar esta especialidad de tu perfil? Esta acción no se puede deshacer."
                onConfirm={handleConfirmRemove}
                isPending={remove.isPending}
            />
        </section>
    );
}
