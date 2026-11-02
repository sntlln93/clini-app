import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { ResetPasswordForm } from './-components/ResetPasswordForm';

export const Route = createFileRoute('/_open/restablecer-contrasena/$token')({
    head: () => titleHead('Elegí una contraseña nueva'),
    component: ResetPasswordPage,
});

function ResetPasswordPage() {
    const { token } = Route.useParams();

    return (
        <div className="w-full max-w-sm">
            <ResetPasswordForm token={token} />
        </div>
    );
}
