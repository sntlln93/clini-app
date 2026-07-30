/**
 * Extracts the string values of a PHP string-backed enum's cases from its
 * source code, e.g. `case Foo = 'foo';` → `'foo'`.
 *
 * Deliberately a standalone, fs-free module — reusable for the enum-parity
 * test today and, per issue #87's own upgrade path, for a future generator
 * once the panel's error codes grow enough to justify one (~30 codes, or
 * frequent churn). No PHP parser dependency: this is a narrow, single-shape
 * regex over `case Name = '...';` lines, not a general PHP parser.
 */
export function parsePhpStringEnumCases(source: string): string[] {
    const pattern = /case\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*'([^']*)'\s*;/g;

    return [...source.matchAll(pattern)].map((match) => match[1]);
}
