import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useOwnProfessionalRole } from '@/hooks/use-own-professional-role';
import type { Membership } from '@/types/membership';
import { useId, useState } from 'react';

/**
 * Whoever manages the team includes or excludes themselves as a
 * professional here (#286), so an owner who only manages can free Free's
 * professional for someone who attends. Stepping out keeps their data, as
 * deactivating a member does, but warns first.
 */
export function AttendPatientsSection({
    membership,
}: {
    membership: Membership;
}) {
    const switchId = useId();
    const ownRole = useOwnProfessionalRole(membership);
    const [confirmingLeave, setConfirmingLeave] = useState(false);
    const attends = membership.roles.includes('professional');

    function handleChange(checked: boolean) {
        if (checked) {
            ownRole.mutate(true);
        } else {
            setConfirmingLeave(true);
        }
    }

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Atención de pacientes</h2>
                <p className="text-sm text-muted-foreground">
                    Activalo si atendés pacientes: vas a figurar como
                    profesional en la agenda y en la reserva online.
                </p>
            </div>

            <div className="flex items-center gap-2">
                <Switch
                    id={switchId}
                    checked={attends}
                    disabled={ownRole.isPending}
                    onCheckedChange={handleChange}
                />
                <Label htmlFor={switchId}>
                    Atiendo pacientes en este consultorio
                </Label>
            </div>

            <ConfirmDialog
                open={confirmingLeave}
                onOpenChange={setConfirmingLeave}
                title="Dejar de atender pacientes"
                description="Vas a dejar de figurar en la agenda y en la reserva online, y tus turnos próximos no se van a ver en la agenda: reasignalos o cancelalos antes. Tus turnos, horarios, servicios y especialidades se conservan y vuelven si lo activás de nuevo."
                confirmLabel="Dejar de atender"
                onConfirm={() => ownRole.mutate(false)}
                isPending={ownRole.isPending}
            />
        </section>
    );
}
