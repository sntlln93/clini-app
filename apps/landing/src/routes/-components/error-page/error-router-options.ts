import { NotFoundPage } from './NotFoundPage';
import { ServerErrorPage } from './ServerErrorPage';

// Shared by `getRouter` and the tests that pin it: `router.tsx` imports the
// generated route tree, which a fresh checkout doesn't have yet.
export const errorRouterOptions = {
    defaultNotFoundComponent: NotFoundPage,
    defaultErrorComponent: ServerErrorPage,
} as const;
