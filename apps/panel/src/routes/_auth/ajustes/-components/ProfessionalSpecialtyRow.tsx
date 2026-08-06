import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Membership } from '@/types/membership';
import type {
    ProfessionalSpecialty,
    UserSpecialty,
} from '@/types/professional';
import { useId, useState } from 'react';
import { useToggleProfessionalSpecialty } from '../-hooks/use-professional-specialties';

type ProfessionalSpecialtyRowProps = {
    membership: Membership;
    canManage: boolean;
    credentials: UserSpecialty[];
    assigned: ProfessionalSpecialty[];
};

export function ProfessionalSpecialtyRow({
    membership,
    canManage,
    credentials,
    assigned,
}: ProfessionalSpecialtyRowProps) {
    const checkboxIdPrefix = useId();
    const { assign, remove } = useToggleProfessionalSpecialty(membership.id);
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
        <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">
                {membership.user.name ?? membership.user.email}
            </p>

            {credentials.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Este profesional no tiene especialidades credenciales
                    cargadas en «Mis especialidades».
                </p>
            )}

            {credentials.length > 0 && (
                <div className="space-y-1.5">
                    {credentials.map((credential) => {
                        const checkboxId = `${checkboxIdPrefix}-${credential.specialty_id}`;
                        return (
                            <div
                                key={credential.specialty_id}
                                className="flex items-center gap-2 text-sm"
                            >
                                <Checkbox
                                    id={checkboxId}
                                    disabled={!canManage}
                                    checked={assigned.some(
                                        (item) =>
                                            item.specialty_id ===
                                            credential.specialty_id,
                                    )}
                                    onCheckedChange={(checked) =>
                                        toggle(
                                            credential.specialty_id,
                                            checked === true,
                                        )
                                    }
                                />
                                <Label htmlFor={checkboxId}>
                                    {credential.specialty_name}
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
                description="¿Quitar esta especialidad de este profesional? Esta acción no se puede deshacer."
                onConfirm={handleConfirmRemove}
                isPending={remove.isPending}
            />
        </div>
    );
}
