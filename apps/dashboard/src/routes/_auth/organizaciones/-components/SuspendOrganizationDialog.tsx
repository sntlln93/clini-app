import { Button } from '@/components/ui/button';
import { ReasonDialog } from '@/features/reason-dialog/ReasonDialog';
import { Ban } from 'lucide-react';
import { useState } from 'react';
import { useSuspendOrganization } from '../-hooks/use-suspend-organization';

export function SuspendOrganizationDialog({
    organizationId,
}: {
    organizationId: number;
}) {
    const [open, setOpen] = useState(false);
    const { mutateAsync } = useSuspendOrganization(organizationId);

    return (
        <ReasonDialog
            trigger={
                <Button variant="destructive">
                    <Ban data-icon="inline-start" />
                    Suspender
                </Button>
            }
            open={open}
            onOpenChange={setOpen}
            title="Suspender organización"
            description="Sus miembros no podrán usar el panel y la reserva online quedará deshabilitada."
            submitLabel="Suspender"
            onSubmit={mutateAsync}
        />
    );
}
