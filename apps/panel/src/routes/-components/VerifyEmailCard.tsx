import { CardErrorState } from '@/components/CardErrorState';
import { CardSkeleton } from '@/components/CardSkeleton';
import { Button } from '@/components/ui/button';
import { mapToAppError } from '@/lib/api-errors';
import { messageForAppError } from '@/lib/error-codes';
import { Link } from '@tanstack/react-router';
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
        return <CardSkeleton />;
    }

    // The visitor may or may not be signed in here, so the way out is `/`: the `_auth` guard sends an anonymous one on to login.
    if (isError || !data) {
        return (
            <CardErrorState
                title="Enlace no válido"
                message={infoErrorMessage(error)}
                action={
                    <Button
                        className="w-full"
                        nativeButton={false}
                        render={<Link to="/" />}
                    >
                        Ir a Clini
                    </Button>
                }
            />
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
