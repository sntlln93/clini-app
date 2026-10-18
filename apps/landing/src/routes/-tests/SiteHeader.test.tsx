import { brand, brandAssetUrl } from '@clini/brand';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteHeader } from '../-components/SiteHeader';

describe('SiteHeader', () => {
    it("shows the manifest's isotype for each theme next to the wordmark", () => {
        const { container } = render(<SiteHeader />);
        const home = screen.getByRole('link', { name: 'Clini, inicio' });

        expect(home.textContent).toBe(brand.wordmark);
        // Decorative: alt="" keeps them out of the link's name.
        expect(
            [...container.querySelectorAll('img')].map((img) => ({
                src: img.getAttribute('src'),
                alt: img.getAttribute('alt'),
            })),
        ).toEqual([
            { src: brandAssetUrl(brand.assets.isotype.light), alt: '' },
            { src: brandAssetUrl(brand.assets.isotype.dark), alt: '' },
        ]);
    });
});
