import { absoluteUrl, SITE_URL, type PublicPath } from '@/lib/site';

export const SITE_TITLE = 'Clini · Turnos online para tu consultorio';
export const SITE_DESCRIPTION =
    'Turnos online para profesionales y consultorios: agenda, reserva online, recordatorios por mail y sala de espera en un solo lugar.';

type PageHeadOptions = {
    path: PublicPath;
    title: string;
    description: string;
};

/**
 * A public page's own `<head>` entries: title, description, their og: twins
 * and, with the landing's origin, og:url and the canonical link. Each page
 * declares them itself instead of the root, so a 404 or an error page gets no
 * canonical, and TanStack Router doesn't dedupe links by `rel`: one declared
 * in the root as well would end up twice. The canonical never carries the
 * query (`/contacto?plan=centro` is `/contacto`).
 */
export function pageHead(
    { path, title, description }: PageHeadOptions,
    siteUrl: string = SITE_URL,
) {
    const url = absoluteUrl(path, siteUrl);

    return {
        meta: [
            { title },
            { name: 'description', content: description },
            { property: 'og:title', content: title },
            { property: 'og:description', content: description },
            ...(url ? [{ property: 'og:url', content: url }] : []),
        ],
        links: url ? [{ rel: 'canonical', href: url }] : [],
    };
}
