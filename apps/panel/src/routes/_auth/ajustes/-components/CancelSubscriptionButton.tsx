import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatSubscriptionDate, paidPeriodEnd } from '@/lib/subscription';
import type { Subscription } from '@/types/subscription';
import { useCancelSubscription } from '../-hooks/use-cancel-subscription';

type CancelSubscriptionButtonProps = {
    subscription: Subscription;
};

const FREE_PLAN_DETAIL =
    'no vas a poder invitar miembros, usar la sala de espera, emitir recetas ni definir links de reserva por profesional, y si hay más de un profesional activo la agenda queda en modo solo lectura. No se borra ningún dato.';

function confirmationCopy(subscription: Subscription): string {
    const paidUntil = paidPeriodEnd(subscription);
    const consequence = paidUntil
        ? `Seguís en el plan Consultorio hasta el ${formatSubscriptionDate(paidUntil)}, el final del período que ya pagaste. Después tu consultorio pasa al plan Gratis: ${FREE_PLAN_DETAIL}`
        : `Como no hay un período pago en curso, tu consultorio pasa al plan Gratis de inmediato: ${FREE_PLAN_DETAIL}`;

    return `Mercado Pago deja de cobrar la suscripción. ${consequence} Podés volver a suscribirte cuando quieras.`;
}

/** Owner-only: asks for confirmation, explaining what happens next, before cancelling. */
export function CancelSubscriptionButton({
    subscription,
}: CancelSubscriptionButtonProps) {
    const { cancel, isCancelling } = useCancelSubscription();

    return (
        <ConfirmDialog
            trigger={
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isCancelling}
                >
                    {isCancelling ? (
                        <>
                            <Spinner data-icon="inline-start" aria-hidden />
                            Cancelando…
                        </>
                    ) : (
                        'Cancelar suscripción'
                    )}
                </Button>
            }
            title="¿Cancelar la suscripción?"
            description={confirmationCopy(subscription)}
            confirmLabel="Cancelar suscripción"
            cancelLabel="Volver"
            isPending={isCancelling}
            onConfirm={cancel}
        />
    );
}
