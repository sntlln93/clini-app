import { brand, brandAssetUrl, brandHeadLinks } from '@clini/brand';
import { expect, test } from './fixtures';

// #236: every app declares the brand's head links and serves the files the
// @clini/brand plugin publishes from the manifest.
const APPS = [
    ['panel', process.env.E2E_BASE_URL ?? 'http://localhost:5174'],
    ['dashboard', process.env.E2E_DASHBOARD_URL ?? 'http://localhost:5175'],
    ['landing', process.env.E2E_LANDING_URL ?? 'http://localhost:5176'],
] as const;

const CONTENT_TYPES: Record<string, RegExp> = {
    icon: /^image\/(svg\+xml|x-icon)/,
    'apple-touch-icon': /^image\/png/,
    manifest: /^application\/manifest\+json/,
};

for (const [app, origin] of APPS) {
    test(`${app} links and serves the brand files of the manifest`, async ({
        request,
    }) => {
        const html = await (await request.get(`${origin}/`)).text();

        for (const link of brandHeadLinks()) {
            expect(html).toContain(`href="${link.href}"`);

            const response = await request.get(`${origin}${link.href}`);
            expect(response.status(), link.href).toBe(200);
            expect(response.headers()['content-type']).toMatch(
                CONTENT_TYPES[link.rel],
            );
        }
    });
}

test("panel serves the logo the API's mails point at", async ({ request }) => {
    const response = await request.get(brandAssetUrl(brand.assets.mailLogo));

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^image\/png/);
});
