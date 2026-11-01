import { createFileRoute, Outlet } from '@tanstack/react-router';
import { settingsNav } from './-components/settings-nav';

export const Route = createFileRoute('/_auth/ajustes')({
    staticData: { secondaryNav: settingsNav },
    component: AjustesLayout,
});

// Every tab of Ajustes under one heading; the tabs live in the secondary
// navigation the layout draws under the header.
function AjustesLayout() {
    return (
        <div className="mx-auto max-w-2xl space-y-8">
            <h1 className="text-2xl tracking-tight">Ajustes</h1>
            <Outlet />
        </div>
    );
}
