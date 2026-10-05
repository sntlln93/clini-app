import { titleHead } from '@/lib/page-title';
import { safeInternalPath } from '@/lib/safe-internal-path';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { LoginForm } from './-components/LoginForm';

const loginSearchSchema = z.object({
    redirect: z.string().optional().catch(undefined),
});

type LoginSearch = { redirect?: string };

export const Route = createFileRoute('/_public/login')({
    // Sanitized at the boundary: an unsafe `redirect` (external, auth page) is dropped, never followed.
    validateSearch: (search): LoginSearch => {
        const redirect = safeInternalPath(
            loginSearchSchema.parse(search).redirect,
        );

        return redirect ? { redirect } : {};
    },
    head: () => titleHead('Iniciar sesión'),
    component: LoginPage,
});

function LoginPage() {
    const { redirect } = Route.useSearch();

    return (
        <div className="w-full max-w-sm">
            <LoginForm redirectTo={redirect} />
        </div>
    );
}
