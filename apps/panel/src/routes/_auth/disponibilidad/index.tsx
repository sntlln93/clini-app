import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/disponibilidad/')({
    component: () => <h1 className="text-2xl font-semibold">Disponibilidad</h1>,
});
