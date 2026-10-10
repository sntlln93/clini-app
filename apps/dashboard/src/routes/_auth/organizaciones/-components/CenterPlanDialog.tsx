import { Button } from '@/components/ui/button';
import { ReasonDialog } from '@/features/reason-dialog/ReasonDialog';
import { Building2 } from 'lucide-react';
import { useState } from 'react';
import { useAssignPlan } from '../-hooks/use-assign-plan';

type CenterPlanDialogProps = {
    organizationId: number;
    /** Whether Centro is already assigned: the dialog then removes it. */
    assigned: boolean;
};

/** Assigns or removes Centro, which is billed outside the platform; the reason goes to the audit trail. */
export function CenterPlanDialog({
    organizationId,
    assigned,
}: CenterPlanDialogProps) {
    const [open, setOpen] = useState(false);
    const { mutateAsync } = useAssignPlan(
        organizationId,
        assigned ? null : 'center',
    );

    return assigned ? (
        <ReasonDialog
            trigger={
                <Button variant="outline">
                    <Building2 data-icon="inline-start" />
                    Quitar plan Centro
                </Button>
            }
            open={open}
            onOpenChange={setOpen}
            title="Quitar plan Centro"
            description="La organización vuelve al plan de su suscripción, o a Gratis si no tiene una. Con más de un profesional activo en Gratis, su agenda queda en solo lectura."
            submitLabel="Quitar plan Centro"
            onSubmit={mutateAsync}
        />
    ) : (
        <ReasonDialog
            trigger={
                <Button variant="outline">
                    <Building2 data-icon="inline-start" />
                    Asignar plan Centro
                </Button>
            }
            open={open}
            onOpenChange={setOpen}
            title="Asignar plan Centro"
            description="Centro se cobra por fuera de la plataforma: incluye todas las funciones, sin límite de profesionales. Si la organización tiene una suscripción que todavía puede cobrar, primero hay que cancelarla."
            submitLabel="Asignar plan Centro"
            submitVariant="default"
            onSubmit={mutateAsync}
        />
    );
}
