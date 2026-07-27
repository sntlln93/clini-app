import { Checkbox } from '@/components/ui/checkbox';
import type { Membership } from '@/types/membership';
import {
    useProfessionalSpecialties,
    useToggleProfessionalSpecialty,
} from '../-hooks/use-professional-specialties';
import { useUserSpecialties } from '../-hooks/use-user-specialties';

type ProfessionalSpecialtyRowProps = {
    membership: Membership;
    canManage: boolean;
};

export function ProfessionalSpecialtyRow({
    membership,
    canManage,
}: ProfessionalSpecialtyRowProps) {
    const { data: credentials, isPending: isCredentialsPending } =
        useUserSpecialties(membership.user.id);
    const { data: assigned, isPending: isAssignedPending } =
        useProfessionalSpecialties(membership.id);
    const { assign, remove } = useToggleProfessionalSpecialty(membership.id);

    const isPending = isCredentialsPending || isAssignedPending;

    function toggle(specialtyId: number, checked: boolean) {
        if (checked) {
            assign.mutate(specialtyId);
        } else {
            remove.mutate(specialtyId);
        }
    }

    return (
        <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">
                {membership.user.name ?? membership.user.email}
            </p>

            {isPending && (
                <p className="text-sm text-muted-foreground">Cargando…</p>
            )}

            {!isPending && credentials && credentials.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Este profesional no tiene especialidades credenciales
                    cargadas en «Mis especialidades».
                </p>
            )}

            {!isPending && credentials && assigned && (
                <div className="space-y-1.5">
                    {credentials.map((credential) => (
                        <label
                            key={credential.specialty_id}
                            className="flex items-center gap-2 text-sm"
                        >
                            <Checkbox
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
                            {credential.specialty_name}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
