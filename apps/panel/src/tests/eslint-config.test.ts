import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const LINT_TIMEOUT = 20_000;

function newEslint() {
    // `import.meta.url` is assigned to a variable before being passed to
    // `new URL()`: Vite's dev-server transform special-cases the inline
    // literal form `new URL('...', import.meta.url)` for asset bundling and
    // rewrites it to an `/@fs/...` dev-server URL, which is not a `file:`
    // URL and makes `fileURLToPath` throw under Vitest's jsdom environment.
    const testFileUrl = import.meta.url;
    return new ESLint({
        cwd: fileURLToPath(new URL('../..', testFileUrl)),
    });
}

async function lintRestrictedSyntaxMessages(filePath: string, code: string) {
    const eslint = newEslint();
    const results = await eslint.lintText(code, {
        filePath,
        warnIgnored: false,
    });
    return results[0].messages.filter(
        (m) => m.ruleId === 'no-restricted-syntax',
    );
}

describe('eslint no-restricted-syntax: router.invalidate()', () => {
    const ROUTER_INVALIDATE_CODE =
        'export async function useThing(router: { invalidate: () => Promise<void> }) { await router.invalidate(); }';

    it(
        'fires on a normal source file',
        async () => {
            const messages = await lintRestrictedSyntaxMessages(
                'src/routes/_auth/pacientes/-hooks/use-thing.ts',
                ROUTER_INVALIDATE_CODE,
            );

            expect(messages).toHaveLength(1);
            expect(messages[0].message).toContain('useRefreshPageData');
        },
        LINT_TIMEOUT,
    );

    it(
        'fires when the router variable is renamed',
        async () => {
            const code =
                'export async function useThing(r: { invalidate: () => Promise<void> }) { await r.invalidate(); }';

            const messages = await lintRestrictedSyntaxMessages(
                'src/routes/_auth/pacientes/-hooks/use-thing.ts',
                code,
            );

            expect(messages).toHaveLength(1);
        },
        LINT_TIMEOUT,
    );

    it.each([
        'src/lib/page-data.ts',
        'src/hooks/use-refresh-page-data.ts',
        'src/components/RouteErrorState.tsx',
    ])(
        'does not fire in the exempt file %s',
        async (filePath) => {
            const messages = await lintRestrictedSyntaxMessages(
                filePath,
                ROUTER_INVALIDATE_CODE,
            );

            expect(messages).toHaveLength(0);
        },
        LINT_TIMEOUT,
    );

    it(
        "the 'use client' SSR-directive ban survives in an exempt file",
        async () => {
            const messages = await lintRestrictedSyntaxMessages(
                'src/lib/page-data.ts',
                "'use client';\nexport const x = 1;\n",
            );

            expect(messages).toHaveLength(1);
            expect(messages[0].message).toContain("'use client'");
        },
        LINT_TIMEOUT,
    );
});
