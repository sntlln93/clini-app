import axe from 'axe-core';
import { expect } from 'vitest';

// `vitest-axe` (the tool named in the issue) ships a broken type surface on
// Vitest 4: its public `vitest-axe/matchers` entry point re-exports
// `toHaveNoViolations` as `export type *`, so importing the real runtime
// value fails `tsc` (TS1485/TS1362), and its `Vi.Assertion` type-augmentation
// namespace doesn't exist on Vitest 4's `Assertion` interface either
// (`property 'toHaveNoViolations' does not exist on type 'Assertion<...>'`).
// Both were verified locally against vitest@4.1.10 before falling back —
// per the handoff — to calling `axe-core` directly (the same engine
// `vitest-axe` wraps) from this helper instead.

type SkipRule = {
    /** axe-core rule id, e.g. 'color-contrast'. */
    id: string;
    /** Why this rule can't produce a meaningful result in jsdom. */
    reason: string;
};

/**
 * Runs axe-core against a rendered container and fails with a readable
 * violation list if it finds any. Only `results.violations` fails the
 * assertion — `results.incomplete` (e.g. `color-contrast`, which jsdom can't
 * compute since it doesn't render actual pixels) is intentionally left out
 * of both the pass and fail path, so it can't be silently swallowed into a
 * false "no violations" pass.
 */
async function expectNoA11yViolations(
    container: Element,
    { skip = [] }: { skip?: SkipRule[] } = {},
): Promise<void> {
    const rules = Object.fromEntries(
        skip.map(({ id }) => [id, { enabled: false }]),
    );
    const results = await axe.run(container, { rules });

    expect(results.violations, formatViolations(results.violations)).toEqual(
        [],
    );
}

function formatViolations(violations: axe.Result[]): string {
    if (violations.length === 0) {
        return '';
    }

    return violations
        .map((violation) => {
            const nodes = violation.nodes
                .map(
                    (node) =>
                        `  - ${node.target.join(', ')}\n    ${node.html}\n    ${node.failureSummary ?? ''}`,
                )
                .join('\n');
            return `${violation.id}: ${violation.help} (${violation.helpUrl})\n${nodes}`;
        })
        .join('\n\n');
}

export { expectNoA11yViolations };
