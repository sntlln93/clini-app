import { PanelLayout } from '@/layouts/PanelLayout';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth')({
    component: () => (
        <PanelLayout>
            <Outlet />
        </PanelLayout>
    ),
});
