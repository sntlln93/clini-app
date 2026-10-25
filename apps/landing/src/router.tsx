import { createRouter } from '@tanstack/react-router';
import { NotFoundPage } from './routes/-components/error-page/NotFoundPage';
import { ServerErrorPage } from './routes/-components/error-page/ServerErrorPage';
import { routeTree } from './routeTree.gen';

export function getRouter() {
    return createRouter({
        routeTree,
        scrollRestoration: true,
        defaultNotFoundComponent: NotFoundPage,
        defaultErrorComponent: ServerErrorPage,
    });
}

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}
