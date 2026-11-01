/// <reference types="node" />
import { PUBLIC_PATHS } from '@/lib/site';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// #249: what a search engine or a link preview reads from the landing. The
// routes read VITE_SITE_URL when their module loads, so each case imports
// them afresh under the env it stubs.
type Handler = () => Response;
type HeadFn = () => {
    meta?: Array<Record<string, string>>;
    links?: Array<Record<string, string>>;
};

async function load(siteUrl: string) {
    vi.stubEnv('VITE_SITE_URL', siteUrl);
    vi.resetModules();

    const [home, contact, sitemap, robots] = await Promise.all([
        import('../index'),
        import('../contacto'),
        import('../sitemap[.]xml'),
        import('../robots[.]txt'),
    ]);

    const get = (route: typeof sitemap.Route | typeof robots.Route) =>
        (route.options.server?.handlers as { GET: Handler }).GET();

    return {
        homeHead: (home.Route.options.head as HeadFn)(),
        contactHead: (contact.Route.options.head as HeadFn)(),
        sitemap: () => get(sitemap.Route),
        robots: () => get(robots.Route),
    };
}

function canonical(head: ReturnType<HeadFn>) {
    return head.links?.find((link) => link.rel === 'canonical')?.href;
}

function ogUrl(head: ReturnType<HeadFn>) {
    return head.meta?.find((meta) => meta.property === 'og:url')?.content;
}

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('with the landing origin', () => {
    it('gives every page its absolute canonical and og:url', async () => {
        const { homeHead, contactHead } = await load('https://clini.example/');

        expect(canonical(homeHead)).toBe('https://clini.example/');
        expect(ogUrl(homeHead)).toBe('https://clini.example/');
        expect(canonical(contactHead)).toBe('https://clini.example/contacto');
        expect(ogUrl(contactHead)).toBe('https://clini.example/contacto');
    });

    it('serves the sitemap as XML', async () => {
        const response = (await load('https://clini.example')).sitemap();

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe(
            'application/xml; charset=utf-8',
        );
        const xml = await response.text();
        expect(xml).toContain('<loc>https://clini.example/</loc>');
        expect(xml).toContain('<loc>https://clini.example/contacto</loc>');
    });

    it('serves robots.txt with the absolute sitemap', async () => {
        const response = (await load('https://clini.example')).robots();

        expect(response.headers.get('Content-Type')).toBe(
            'text/plain; charset=utf-8',
        );
        expect(await response.text()).toContain(
            'Sitemap: https://clini.example/sitemap.xml',
        );
    });
});

describe('without the landing origin', () => {
    it('declares no canonical or og:url', async () => {
        const { homeHead, contactHead } = await load('');

        for (const head of [homeHead, contactHead]) {
            expect(canonical(head)).toBeUndefined();
            expect(ogUrl(head)).toBeUndefined();
        }
    });

    it('answers the sitemap with a 404, having no absolute URL to list', async () => {
        expect((await load('')).sitemap().status).toBe(404);
    });

    it('still serves robots.txt, without a Sitemap line', async () => {
        const text = await (await load('')).robots().text();

        expect(text).toContain('User-agent: *');
        expect(text).not.toContain('Sitemap:');
    });
});

// A new page has to be added to the sitemap too. Pages are the .tsx route
// files, in folders too (`precios/index.tsx`); the server-only routes (.ts),
// the root and the `-`-prefixed folders TanStack Router skips are not.
it('lists every page route in the sitemap', () => {
    const routes = readdirSync(path.resolve(__dirname, '..'), {
        recursive: true,
        encoding: 'utf8',
    })
        .filter(
            (file) =>
                file.endsWith('.tsx') &&
                file !== '__root.tsx' &&
                !file.split(path.sep).some((part) => part.startsWith('-')),
        )
        .map((file) => {
            const route = file
                .replace(/\.tsx$/, '')
                .split(path.sep)
                .join('/')
                .replace(/(^|\/)index$/, '');

            return `/${route}`;
        });

    expect([...PUBLIC_PATHS].sort()).toEqual(routes.sort());
});
