import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export function getRouter() {
    return createRouter({
        routeTree,
        scrollRestoration: true,
        defaultNotFoundComponent: NotFound,
    });
}

function NotFound() {
    return (
        <main className="grid min-h-svh place-items-center px-4 text-center">
            <div className="grid gap-3">
                <h1 className="text-3xl">No encontramos esta página</h1>
                <a className="text-primary underline" href="/">
                    Volver al inicio
                </a>
            </div>
        </main>
    );
}

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}
