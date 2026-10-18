import { brand } from './brand.config.ts';

export { brand };

/** Where the `@clini/brand/vite` plugin publishes the files of `assets/`. */
export const BRAND_BASE_PATH = '/brand/';

/** Generated per app by the plugin from the manifest, not a file in `assets/`. */
export const WEB_MANIFEST_FILE = 'manifest.webmanifest';

export function brandAssetUrl(file: string): string {
    return `${BRAND_BASE_PATH}${file}`;
}

/** Every file the manifest names (its string leaves): the only ones published. */
export function brandFiles(value: unknown = brand.assets): string[] {
    if (typeof value === 'string') {
        return [value];
    }
    if (typeof value === 'object' && value !== null) {
        return Object.values(value).flatMap((entry) => brandFiles(entry));
    }

    return [];
}

export type BrandLink = {
    rel: string;
    href: string;
    type?: string;
    sizes?: string;
};

/** The `<head>` links every app declares: favicons, touch icon and web manifest. */
export function brandHeadLinks(): BrandLink[] {
    const { favicon, appleTouchIcon } = brand.assets;

    return [
        { rel: 'icon', href: brandAssetUrl(favicon.ico), sizes: '32x32' },
        {
            rel: 'icon',
            href: brandAssetUrl(favicon.svg),
            type: 'image/svg+xml',
        },
        { rel: 'apple-touch-icon', href: brandAssetUrl(appleTouchIcon) },
        { rel: 'manifest', href: brandAssetUrl(WEB_MANIFEST_FILE) },
    ];
}

/**
 * The web app manifest: only the name and icons, so a saved shortcut carries
 * the brand. No `display`, so it doesn't turn the app into a standalone PWA.
 */
export function webManifest(appName: string) {
    return {
        name: appName,
        short_name: brand.name,
        start_url: '/',
        theme_color: brand.themeColor,
        background_color: brand.backgroundColor,
        icons: brand.assets.pwaIcons.map(({ file, size }) => ({
            src: brandAssetUrl(file),
            sizes: `${size}x${size}`,
            type: 'image/png',
        })),
    };
}
