import { ListSkeleton } from '@/components/ListSkeleton';
import { Button } from '@/components/ui/button';
import { mapToAppError } from '@/lib/api-errors';
import { messageForAppError } from '@/lib/error-codes';
import {
    useEmailVerificationInfo,
    useVerifyEmail,
} from '../-hooks/use-verify-email';

function infoErrorMessage(error: unknown): string {
    return messageForAppError(mapToAppError(error));
}

type VerifyEmailCardProps = {
    token: string;
};

export function VerifyEmailCard({ token }: VerifyEmailCardProps) {
    const { data, isPending, isError, error } = useEmailVerificationInfo(token);
    const {
        mutate,
        isPending: isVerifying,
        error: verifyError,
    } = useVerifyEmail(token);

    if (isPending) {
        return <ListSkeleton />;
    }

    if (isError || !data) {
        return (
            <p className="text-sm text-destructive">
                {infoErrorMessage(error)}
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div className="space-y-1 text-center">
                <h1 className="text-2xl font-semibold">Confirmá tu correo</h1>
                <p className="text-sm text-muted-foreground">
                    Vas a confirmar la cuenta de <strong>{data.email}</strong>.
                </p>
            </div>

            {verifyError && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {infoErrorMessage(verifyError)}
                </div>
            )}

            <Button
                type="button"
                className="w-full"
                disabled={isVerifying}
                onClick={() => mutate()}
            >
                {isVerifying ? 'Confirmando…' : 'Confirmar correo'}
            </Button>
        </div>
    );
}
