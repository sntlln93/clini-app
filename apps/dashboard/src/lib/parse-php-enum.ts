/**
 * Extracts a PHP string-backed enum's case values, e.g. `case Foo = 'foo';` → `'foo'`.
 * A narrow, single-shape regex — not a general PHP parser.
 */
export function parsePhpStringEnumCases(source: string): string[] {
    const pattern = /case\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*'([^']*)'\s*;/g;

    return [...source.matchAll(pattern)].map((match) => match[1]);
}
