import { NotFoundState } from '@/components/NotFoundState';
import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';

// Catch-all for URLs no other route matches. A router-level not-found would
// only be caught by the root (no layout); as a splat under `_auth` the miss
// keeps the panel chrome and goes through the session guard like any page.
export const Route = createFileRoute('/_auth/$')({
    head: () => titleHead('Página no encontrada'),
    component: NotFoundState,
});
