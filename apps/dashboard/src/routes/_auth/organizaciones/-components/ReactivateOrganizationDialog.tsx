import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useReactivateOrganization } from '../-hooks/use-reactivate-organization';

/** Confirming closes the dialog at once; a failure (e.g. a 409 because someone else already reactivated it) surfaces as a toast. */
export function ReactivateOrganizationDialog({
    organizationId,
}: {
    organizationId: number;
}) {
    const { mutate, isPending } = useReactivateOrganization(organizationId);

    return (
        <ConfirmDialog
            trigger={
                <Button variant="outline">
                    <RotateCcw data-icon="inline-start" />
                    Reactivar
                </Button>
            }
            title="Reactivar organización"
            description="Sus miembros vuelven a usar el panel y la reserva online se habilita de nuevo."
            confirmLabel="Reactivar"
            isPending={isPending}
            confirmVariant="default"
            onConfirm={() => mutate()}
        />
    );
}
