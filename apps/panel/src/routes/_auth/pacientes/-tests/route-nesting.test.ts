import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Regression coverage for issue #217's Fix Step 8: `pacientes/$id.tsx` (the
// patient detail view) must not accidentally nest `pacientes/$id.editar`
// beneath it — `PacienteDetallePage` renders no `<Outlet />`, so a nested
// editar route would never mount.
//
// This asserts the on-disk convention directly (file name + the literal
// path passed to `createFileRoute`) instead of matching against the
// generated `routeTree.gen.ts`: that file is generated and gitignored (see
// CLAUDE.md), and `npm run test` doesn't run `vite build` first, so it
// doesn't exist on a fresh checkout — see Fix Step 10. TanStack Router's
// file-based generator derives nesting purely from the file name (a
// trailing underscore on `$id_` de-nests the child route), so checking the
// name — and the path literal the generator keeps in sync with it — catches
// the same regression a `routeTree.gen.ts` assertion would, without
// depending on that file existing.
//
// `import.meta.url` is assigned to a variable before being passed to
// `new URL()`: Vite's dev-server transform special-cases the inline literal
// form `new URL('...', import.meta.url)` for asset bundling and rewrites it
// to an `/@fs/...` dev-server URL, which is not a `file:` URL and makes
// `fileURLToPath` throw under Vitest's jsdom environment.
const testFileUrl = import.meta.url;
const routesDir = fileURLToPath(new URL('..', testFileUrl));

function readRouteFile(fileName: string) {
    return readFileSync(`${routesDir}/${fileName}`, 'utf-8');
}

describe('pacientes/$id and pacientes/$id/editar route nesting', () => {
    it('keeps the editar route on its non-nested file name, sibling to $id.tsx', () => {
        const files = readdirSync(routesDir);

        expect(files).toContain('$id_.editar.tsx');
        expect(files).not.toContain('$id.editar.tsx');
    });

    it('declares the editar route path without the detail route as parent', () => {
        const content = readRouteFile('$id_.editar.tsx');

        expect(content).toContain("createFileRoute('/_auth/pacientes/$id_/editar')");
    });

    it('keeps the detail route on its own path', () => {
        const content = readRouteFile('$id.tsx');

        expect(content).toContain("createFileRoute('/_auth/pacientes/$id')");
    });
});
