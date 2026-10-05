import { Button } from '@/components/ui/button';
import { ReasonDialog } from '@/features/reason-dialog/ReasonDialog';
import { Ban } from 'lucide-react';
import { useState } from 'react';
import { useBlockUser } from '../-hooks/use-block-user';

export function BlockUserDialog({ userId }: { userId: number }) {
    const [open, setOpen] = useState(false);
    const { mutateAsync } = useBlockUser(userId);

    return (
        <ReasonDialog
            trigger={
                <Button variant="destructive">
                    <Ban data-icon="inline-start" />
                    Bloquear
                </Button>
            }
            open={open}
            onOpenChange={setOpen}
            title="Bloquear usuario"
            description="No va a poder iniciar sesión en el panel, y una sesión abierta se cierra en su próxima acción."
            submitLabel="Bloquear"
            onSubmit={mutateAsync}
        />
    );
}
