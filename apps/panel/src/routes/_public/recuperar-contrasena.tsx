import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { ForgotPasswordForm } from './-components/ForgotPasswordForm';

export const Route = createFileRoute('/_public/recuperar-contrasena')({
    head: () => titleHead('Recuperar contraseña'),
    component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
    return (
        <div className="w-full max-w-sm">
            <ForgotPasswordForm />
        </div>
    );
}
