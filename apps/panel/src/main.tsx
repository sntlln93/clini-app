import { NotFoundPage } from '@/features/error-page/NotFoundState';
import { queryClient } from '@/lib/query-client';
import { routerBehavior } from '@/lib/router-behavior';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { routeTree } from './routeTree.gen';

const router = createRouter({
    routeTree,
    context: { queryClient },
    ...routerBehavior,
    // Last-resort fallback; unknown URLs normally land on `_auth`'s `$` splat.
    defaultNotFoundComponent: NotFoundPage,
});

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            {import.meta.env.DEV && <ReactQueryDevtools />}
        </QueryClientProvider>
    </StrictMode>,
);
