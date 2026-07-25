import { createFileRoute } from '@tanstack/react-router';
import { RegisterForm } from './-components/RegisterForm';

export const Route = createFileRoute('/_public/registro')({
    component: RegisterForm,
});
