import { brand, brandAssetUrl } from '@clini/brand';

// Baked at build time (Dockerfile build arg), like VITE_PANEL_URL.
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/+$/, '');

/**
 * The brand's `<meta>` tags. og:image has to be an absolute URL, so without
 * the landing's own origin it is left out rather than sent relative.
 */
export function brandMeta(siteUrl: string = SITE_URL) {
    const { ogImage } = brand.assets;
    const meta: Array<{ name?: string; property?: string; content: string }> = [
        { name: 'theme-color', content: brand.themeColor },
    ];

    if (siteUrl) {
        meta.push(
            {
                property: 'og:image',
                content: `${siteUrl}${brandAssetUrl(ogImage.file)}`,
            },
            { property: 'og:image:width', content: String(ogImage.width) },
            { property: 'og:image:height', content: String(ogImage.height) },
            { property: 'og:image:alt', content: brand.name },
        );
    }

    return meta;
}
