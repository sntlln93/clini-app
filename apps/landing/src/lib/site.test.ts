import { describe, expect, it } from 'vitest';
import { absoluteUrl, robotsTxt, sitemapXml } from './site';

describe('absoluteUrl', () => {
    it("puts the path on the landing's origin", () => {
        expect(absoluteUrl('/contacto', 'https://clini.example')).toBe(
            'https://clini.example/contacto',
        );
    });

    it('has none without the origin', () => {
        expect(absoluteUrl('/contacto', '')).toBeNull();
    });
});

describe('sitemapXml', () => {
    it('lists every public page with an absolute URL', () => {
        expect(sitemapXml('https://clini.example')).toBe(
            [
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
                '  <url><loc>https://clini.example/</loc></url>',
                '  <url><loc>https://clini.example/contacto</loc></url>',
                '</urlset>',
                '',
            ].join('\n'),
        );
    });

    it('escapes what XML reserves', () => {
        expect(sitemapXml('https://clini.example/a&b')).toContain(
            '<loc>https://clini.example/a&amp;b/contacto</loc>',
        );
    });

    it('has nothing to list without the origin', () => {
        expect(sitemapXml('')).toBeNull();
    });
});

describe('robotsTxt', () => {
    it('lets crawlers in and points them at the absolute sitemap', () => {
        expect(robotsTxt('https://clini.example')).toBe(
            'User-agent: *\nAllow: /\n\nSitemap: https://clini.example/sitemap.xml\n',
        );
    });

    it('leaves the Sitemap line out without the origin', () => {
        expect(robotsTxt('')).toBe('User-agent: *\nAllow: /\n');
    });
});
