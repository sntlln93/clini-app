// The landing's own public origin, baked at build time (Dockerfile build arg,
// optional). Every absolute URL the landing declares — canonical, og:url,
// og:image, the sitemap — is built from it, so no domain is written in code.
// Without it, those are left out rather than sent relative.
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').replace(
    /\/+$/,
    '',
);

/** The pages a search engine may index, in the order the sitemap lists them. */
export const PUBLIC_PATHS = ['/', '/contacto'] as const;

export type PublicPath = (typeof PUBLIC_PATHS)[number];

/** `path` on the landing's origin, or null without one. */
export function absoluteUrl(path: string, siteUrl: string = SITE_URL) {
    return siteUrl ? `${siteUrl}${path}` : null;
}

const XML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
};

function escapeXml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => XML_ENTITIES[char]);
}

/** The sitemap, or null without the landing's origin: its URLs must be absolute. */
export function sitemapXml(siteUrl: string = SITE_URL): string | null {
    if (!siteUrl) {
        return null;
    }

    const urls = PUBLIC_PATHS.map(
        (path) => `  <url><loc>${escapeXml(`${siteUrl}${path}`)}</loc></url>`,
    );

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>',
        '',
    ].join('\n');
}

/** Lets every crawler in, and points it at the sitemap when there is one. */
export function robotsTxt(siteUrl: string = SITE_URL): string {
    const lines = ['User-agent: *', 'Allow: /'];

    if (siteUrl) {
        lines.push('', `Sitemap: ${siteUrl}/sitemap.xml`);
    }

    return `${lines.join('\n')}\n`;
}
