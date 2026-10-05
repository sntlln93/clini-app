import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { LockOpen } from 'lucide-react';
import { useUnblockUser } from '../-hooks/use-unblock-user';

export function UnblockUserDialog({ userId }: { userId: number }) {
    const { mutate, isPending } = useUnblockUser(userId);

    return (
        <ConfirmDialog
            trigger={
                <Button variant="outline">
                    <LockOpen data-icon="inline-start" />
                    Desbloquear
                </Button>
            }
            title="Desbloquear usuario"
            description="Va a poder volver a iniciar sesión en el panel."
            confirmLabel="Desbloquear"
            isPending={isPending}
            confirmVariant="default"
            onConfirm={() => mutate()}
        />
    );
}
