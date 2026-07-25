import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/agenda/')({
    component: () => <h1 className="text-2xl font-semibold">Agenda</h1>,
});
