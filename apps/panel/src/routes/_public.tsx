import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_public')({
    component: () => (
        <div className="flex min-h-svh w-full items-center justify-center bg-background p-4">
            <div className="w-full max-w-sm">
                <Outlet />
            </div>
        </div>
    ),
});
