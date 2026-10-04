import { Lock } from 'lucide-react';
import type { AvailabilityReadOnlyReason } from '../-hooks/use-availability-permissions';

const MESSAGES: Record<AvailabilityReadOnlyReason, string> = {
    subscription:
        'Solo lectura: la suscripción no está activa, así que no se pueden hacer cambios.',
    permission:
        'Solo lectura: no tenés permiso para editar la disponibilidad de este profesional.',
};

export function AvailabilityReadOnlyNote({
    reason,
}: {
    reason: AvailabilityReadOnlyReason;
}) {
    return (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            {MESSAGES[reason]}
        </p>
    );
}
