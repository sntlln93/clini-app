import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_public/registro')({
    component: () => <h1>Registro</h1>,
});
