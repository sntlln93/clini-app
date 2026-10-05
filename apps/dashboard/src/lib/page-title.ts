const APP_NAME = 'Clini Plataforma';

/** Tab title as "<most specific> · … · Clini"; empty parts (e.g. a name not loaded yet) are dropped. */
export function pageTitle(...parts: Array<string | null | undefined>): string {
    return [...parts.filter(Boolean), APP_NAME].join(' · ');
}

/** A route `head` that sets only the tab title. */
export function titleHead(...parts: Array<string | null | undefined>) {
    return { meta: [{ title: pageTitle(...parts) }] };
}
