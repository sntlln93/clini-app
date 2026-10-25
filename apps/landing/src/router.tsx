import { createRouter } from '@tanstack/react-router';
import { errorRouterOptions } from './routes/-components/error-page/error-router-options';
import { routeTree } from './routeTree.gen';

export function getRouter() {
    return createRouter({
        routeTree,
        scrollRestoration: true,
        ...errorRouterOptions,
    });
}

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}
