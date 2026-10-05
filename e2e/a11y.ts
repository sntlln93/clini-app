import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import type { Result } from 'axe-core';
import { expect } from './fixtures';

function formatViolations(violations: Result[]) {
    return violations
        .map((violation) => {
            const nodes = violation.nodes
                .map(
                    (node) =>
                        `  - ${node.target.join(', ')}\n    ${node.failureSummary ?? ''}`,
                )
                .join('\n');
            return `${violation.id}: ${violation.help} (${violation.helpUrl})\n${nodes}`;
        })
        .join('\n\n');
}

// Temporary (#254): light-theme pairs of the @clini/theme palette that fall
// short of AA. Only these exact foreground/background pairs are ignored, so
// any other contrast regression still fails. Remove once #254 fixes the
// palette in packages/theme.
const KNOWN_CONTRAST_PAIRS = [
    { fgColor: '#0f7f88', bgColor: '#d9eff0' }, // accent-foreground on accent
    { fgColor: '#0f7f88', bgColor: '#f3f8f7' }, // primary on muted/secondary
];

function isKnownContrastPair(node: Result['nodes'][number]): boolean {
    return node.any.some((check) => {
        const data = check.data as { fgColor?: string; bgColor?: string };
        return KNOWN_CONTRAST_PAIRS.some(
            (pair) =>
                pair.fgColor === data?.fgColor &&
                pair.bgColor === data?.bgColor,
        );
    });
}

function withoutKnownContrastPairs(violations: Result[]): Result[] {
    return violations
        .map((violation) =>
            violation.id === 'color-contrast'
                ? {
                      ...violation,
                      nodes: violation.nodes.filter(
                          (node) => !isKnownContrastPair(node),
                      ),
                  }
                : violation,
        )
        .filter((violation) => violation.nodes.length > 0);
}

/**
 * Runs an axe-core scan of the current page and fails on any violation
 * (except the known palette contrast pairs above).
 */
export async function runA11yScan(page: Page, view: string): Promise<void> {
    // Both real CI and this containerized profile run the panel via `vite
    // dev` (see compose.yaml's comment on the `e2e` service), which mounts
    // `<TanStackRouterDevtools>` — gated behind `import.meta.env.DEV`
    // (routes/__root.tsx) and never present in a production build. It renders
    // its own `<footer>`, which axe's page-level landmark rules (duplicate
    // contentinfo, in particular) evaluate against the whole `document`
    // regardless of `AxeBuilder#exclude()`'s analysis scope — `.exclude()`
    // was tried first and confirmed not to suppress it. Removing the node
    // outright before scanning is what a production build already does by
    // never rendering it in the first place.
    await page.evaluate(() => {
        document.querySelector('.TanStackRouterDevtools')?.remove();
    });

    const results = await new AxeBuilder({ page }).analyze();
    const violations = withoutKnownContrastPairs(results.violations);

    expect(
        violations,
        `Accessibility violations in ${view}:\n${formatViolations(violations)}`,
    ).toEqual([]);
}
