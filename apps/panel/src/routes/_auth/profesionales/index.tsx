import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/profesionales/')({
    component: () => <h1 className="text-2xl font-semibold">Profesionales</h1>,
});
