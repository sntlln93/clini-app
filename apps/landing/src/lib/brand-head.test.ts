import { brand, brandAssetUrl } from '@clini/brand';
import { describe, expect, it } from 'vitest';
import { brandMeta } from './brand-head';

describe('brandMeta', () => {
    it("declares the manifest's og:image as an absolute URL", () => {
        const { ogImage } = brand.assets;

        expect(brandMeta('https://clini.example')).toEqual([
            { name: 'theme-color', content: brand.themeColor },
            {
                property: 'og:image',
                content: `https://clini.example${brandAssetUrl(ogImage.file)}`,
            },
            { property: 'og:image:width', content: String(ogImage.width) },
            { property: 'og:image:height', content: String(ogImage.height) },
            { property: 'og:image:alt', content: brand.name },
        ]);
    });

    it('leaves og:image out without the site URL', () => {
        expect(brandMeta('')).toEqual([
            { name: 'theme-color', content: brand.themeColor },
        ]);
    });
});
