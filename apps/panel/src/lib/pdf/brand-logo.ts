import { brand, brandAssetUrl } from '@clini/brand';

// pdfmake throws on anything but an SVG. A missing brand file still answers
// 200 in production, with the SPA's index.html (nginx's `try_files`).
function isSvg(response: Response, body: string): boolean {
    const type = response.headers.get('content-type') ?? '';
    const start = body.trimStart();

    return (
        type.includes('svg') ||
        start.startsWith('<svg') ||
        start.startsWith('<?xml')
    );
}

/**
 * One of the manifest's SVG files. The panel serves the manifest's files
 * itself, so it is a same-origin read. Null when it can't be read.
 */
async function loadBrandSvg(file: string): Promise<string | null> {
    try {
        const response = await fetch(brandAssetUrl(file));

        if (!response.ok) {
            return null;
        }

        const body = await response.text();

        return isSvg(response, body) ? body : null;
    } catch {
        return null;
    }
}

/**
 * The manifest's light logotype, for a PDF's letterhead. Null when it can't
 * be read: the PDF names the brand instead.
 */
export function loadBrandLogo(): Promise<string | null> {
    return loadBrandSvg(brand.assets.logotype.light);
}

/**
 * The manifest's light isotype, for the brand mark of a PDF's footer. Null
 * when it can't be read: the footer names the brand alone.
 */
export function loadBrandIsotype(): Promise<string | null> {
    return loadBrandSvg(brand.assets.isotype.light);
}
