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

/**
 * Runs an axe-core scan of the current page and fails on any violation.
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

    expect(
        results.violations,
        `Accessibility violations in ${view}:\n${formatViolations(results.violations)}`,
    ).toEqual([]);
}
