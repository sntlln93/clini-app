// Auth pages themselves: returning to them after login would loop.
const EXCLUDED_PATHS = new Set(['/login', '/registro']);

/**
 * Accepts only a same-origin path ("/pacientes/12?x=1"), so a `redirect`
 * search param can never send the user to another site: protocol-relative
 * ("//evil.com"), backslash ("/\evil.com") and absolute URLs are rejected,
 * as is any whitespace/control character (browsers strip tabs/newlines, which
 * would turn "/\t/evil.com" into "//evil.com"). Anything invalid becomes
 * `undefined` so a malformed value never breaks the page.
 */
export function safeInternalPath(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value.startsWith('/')) {
        return undefined;
    }

    if (value.startsWith('//') || value.startsWith('/\\')) {
        return undefined;
    }

    // eslint-disable-next-line no-control-regex
    if (/[\s\u0000-\u001f\u007f]/.test(value)) {
        return undefined;
    }

    const pathname = (value.split(/[?#]/)[0] ?? '').replace(/\/+$/, '');

    if (EXCLUDED_PATHS.has(pathname)) {
        return undefined;
    }

    return value;
}
