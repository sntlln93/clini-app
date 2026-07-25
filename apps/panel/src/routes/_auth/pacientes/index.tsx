import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/pacientes/')({
    component: () => <h1 className="text-2xl font-semibold">Pacientes</h1>,
});
