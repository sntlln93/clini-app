import { createFileRoute } from '@tanstack/react-router';
import { LoginForm } from './-components/LoginForm';

export const Route = createFileRoute('/_public/login')({
    component: LoginPage,
});

function LoginPage() {
    return (
        <div className="w-full max-w-sm">
            <LoginForm />
        </div>
    );
}
