import { createFileRoute } from '@tanstack/react-router';
import { VerifyEmailCard } from './-components/VerifyEmailCard';

export const Route = createFileRoute('/verificar-email/$token')({
    component: VerifyEmailPage,
});

function VerifyEmailPage() {
    const { token } = Route.useParams();

    return (
        <div className="flex min-h-svh w-full items-center justify-center bg-background p-4">
            <div className="w-full max-w-sm">
                <VerifyEmailCard token={token} />
            </div>
        </div>
    );
}
