import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { MailCheck } from 'lucide-react';
import { useVerifyUserEmail } from '../-hooks/use-verify-user-email';

type VerifyEmailDialogProps = {
    userId: number;
    email: string;
    /** Already verified: there is nothing to do, so nothing renders. */
    emailVerifiedAt: string | null;
};

export function VerifyEmailDialog({
    userId,
    email,
    emailVerifiedAt,
}: VerifyEmailDialogProps) {
    const { mutate, isPending } = useVerifyUserEmail(userId);

    if (emailVerifiedAt !== null) {
        return null;
    }

    return (
        <ConfirmDialog
            trigger={
                <Button variant="outline">
                    <MailCheck data-icon="inline-start" />
                    Verificar correo
                </Button>
            }
            title="Verificar correo"
            description={`Vas a marcar ${email} como verificado sin que el usuario abra el enlace. El enlace pendiente deja de funcionar.`}
            confirmLabel="Verificar"
            isPending={isPending}
            confirmVariant="default"
            onConfirm={() => mutate()}
        />
    );
}
