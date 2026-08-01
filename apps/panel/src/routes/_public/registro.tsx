import { createFileRoute } from '@tanstack/react-router';
import { RegisterForm } from './-components/RegisterForm';

export const Route = createFileRoute('/_public/registro')({
    component: RegisterPage,
});

function RegisterPage() {
    return (
        <div className="w-full max-w-sm">
            <RegisterForm />
        </div>
    );
}
