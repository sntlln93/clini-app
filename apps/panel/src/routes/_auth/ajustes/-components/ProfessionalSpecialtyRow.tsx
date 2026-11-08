import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusPill } from '@/components/StatusPill';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Membership } from '@/types/membership';
import type { ProfessionalSpecialty, Specialty } from '@/types/professional';
import { useId, useState } from 'react';
import { useToggleProfessionalSpecialty } from '../-hooks/use-professional-specialties';

type ProfessionalSpecialtyRowProps = {
    membership: Membership;
    canManage: boolean;
    backed: Specialty[];
    assigned: ProfessionalSpecialty[];
};

type SpecialtyOption = { id: number; name: string; backed: boolean };

// What a verified license backs, plus what the practice already offers and
// no license backs anymore (#387): it stays offered, marked, until someone
// takes it off, and can't be offered again until a license backs it.
function specialtyOptions(
    backed: Specialty[],
    assigned: ProfessionalSpecialty[],
): SpecialtyOption[] {
    const backedIds = new Set(backed.map((specialty) => specialty.id));
    const unbacked = assigned
        .filter((item) => !backedIds.has(item.specialty_id))
        .map((item) => ({
            id: item.specialty_id,
            name: item.specialty_name ?? '—',
            backed: false,
        }));

    return [
        ...backed.map(({ id, name }) => ({ id, name, backed: true })),
        ...unbacked,
    ];
}

export function ProfessionalSpecialtyRow({
    membership,
    canManage,
    backed,
    assigned,
}: ProfessionalSpecialtyRowProps) {
    const checkboxIdPrefix = useId();
    const { assign, remove } = useToggleProfessionalSpecialty(membership.id);
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const options = specialtyOptions(backed, assigned);

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

            {options.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Ninguna matrícula verificada de este profesional respalda
                    una especialidad todavía. Sus especialidades salen de las
                    matrículas que carga en Ajustes › Matrículas.
                </p>
            )}

            {options.length > 0 && (
                <div className="space-y-1.5">
                    {options.map((option) => {
                        const checkboxId = `${checkboxIdPrefix}-${option.id}`;
                        const checked = assigned.some(
                            (item) => item.specialty_id === option.id,
                        );
                        return (
                            <div
                                key={option.id}
                                className="flex flex-wrap items-center gap-2 text-sm"
                            >
                                <Checkbox
                                    id={checkboxId}
                                    disabled={!canManage}
                                    checked={checked}
                                    onCheckedChange={(next) =>
                                        toggle(option.id, next === true)
                                    }
                                />
                                <Label htmlFor={checkboxId}>
                                    {option.name}
                                </Label>
                                {!option.backed && (
                                    <StatusPill tone="warning">
                                        Sin respaldo de matrícula
                                    </StatusPill>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                open={confirmingId !== null}
                onOpenChange={(open) => !open && setConfirmingId(null)}
                title="Quitar especialidad"
                description="¿Quitar esta especialidad de este profesional? Podés volver a elegirla mientras una matrícula verificada la respalde."
                onConfirm={handleConfirmRemove}
                isPending={remove.isPending}
            />
        </div>
    );
}
