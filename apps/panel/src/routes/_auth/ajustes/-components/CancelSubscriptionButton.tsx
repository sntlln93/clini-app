import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatSubscriptionDate, paidPeriodEnd } from '@/lib/subscription';
import type { Subscription } from '@/types/subscription';
import { useCancelSubscription } from '../-hooks/use-cancel-subscription';

type CancelSubscriptionButtonProps = {
    subscription: Subscription;
};

const READ_ONLY_DETAIL =
    'podés consultar los turnos, pero no crear ni modificar turnos, notas clínicas, recetas ni disponibilidad, ni recibir reservas online.';

function confirmationCopy(subscription: Subscription): string {
    const paidUntil = paidPeriodEnd(subscription);
    const consequence = paidUntil
        ? `Vas a poder seguir usando la agenda hasta el ${formatSubscriptionDate(paidUntil)}, el final del período que ya pagaste. Después queda en modo solo lectura: ${READ_ONLY_DETAIL}`
        : `Como no hay un período pago en curso, la agenda queda en modo solo lectura de inmediato: ${READ_ONLY_DETAIL}`;

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
