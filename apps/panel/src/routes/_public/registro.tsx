import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { RegisterForm } from './-components/RegisterForm';

export const Route = createFileRoute('/_public/registro')({
    head: () => titleHead('Crear cuenta'),
    component: RegisterPage,
});

function RegisterPage() {
    return (
        <div className="w-full max-w-sm">
            <RegisterForm />
        </div>
    );
}
