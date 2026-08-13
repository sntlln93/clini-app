import { routeTree } from '@/routeTree.gen';
import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

// Regression coverage for issue #217's Fix Step 8: `pacientes/$id.tsx`
// (the patient detail view) must not accidentally nest `pacientes/$id.editar`
// beneath it in the generated route tree — `PacienteDetallePage` renders no
// `<Outlet />`, so a nested editar route would never mount. `matchRoutes`
// only resolves the route tree's parent/child structure for a given
// pathname; it doesn't run `beforeLoad`/`loader`, so this stays a pure
// route-tree assertion against the real generated `routeTree`, not a full
// render/navigation test.
function buildRouter() {
    return createRouter({
        routeTree,
        context: { queryClient: new QueryClient() },
    });
}

describe('pacientes/$id and pacientes/$id/editar route nesting', () => {
    it('matches /pacientes/1/editar as a sibling of pacientes/$id, not nested under it', () => {
        const router = buildRouter();
        const routeIds = router
            .matchRoutes('/pacientes/1/editar', {})
            .map((match) => match.routeId);

        expect(routeIds).toContain('/_auth/pacientes/$id_/editar');
        expect(routeIds).not.toContain('/_auth/pacientes/$id');
    });

    it('matches /pacientes/1 as the patient detail route on its own', () => {
        const router = buildRouter();
        const routeIds = router
            .matchRoutes('/pacientes/1', {})
            .map((match) => match.routeId);

        expect(routeIds).toContain('/_auth/pacientes/$id');
        expect(routeIds).not.toContain('/_auth/pacientes/$id_/editar');
    });
});
