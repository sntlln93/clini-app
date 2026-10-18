/**
 * The brand manifest (#236): the only place that names a brand file. Every
 * entry is a file under `assets/`, published at `/brand/<file>` by the
 * `@clini/brand/vite` plugin. Replacing an element means dropping the new
 * file in `assets/` and, if its name changed, updating its entry here; the
 * expected format and size of each one is in docs/architecture/brand.md.
 *
 * Every current file is a placeholder (`*.placeholder.*`) until the final
 * design lands.
 */
export const brand = {
    name: 'Clini',
    /** The lowercase word set next to the isotype, as the landing writes it. */
    wordmark: 'clini',
    themeColor: '#0d7179',
    backgroundColor: '#fbfdfc',
    assets: {
        isotype: {
            light: 'isotype.placeholder.svg',
            dark: 'isotype-dark.placeholder.svg',
        },
        logotype: {
            light: 'logotype.placeholder.svg',
            dark: 'logotype-dark.placeholder.svg',
        },
        favicon: {
            svg: 'favicon.placeholder.svg',
            ico: 'favicon.placeholder.ico',
        },
        appleTouchIcon: 'apple-touch-icon.placeholder.png',
        pwaIcons: [
            { file: 'icon-192.placeholder.png', size: 192 },
            { file: 'icon-512.placeholder.png', size: 512 },
        ],
        ogImage: { file: 'og-image.placeholder.png', width: 1200, height: 630 },
        /** Published for the API's mails, which read its URL from config/brand.php. */
        mailLogo: 'logotype-mail.placeholder.png',
    },
} as const;
