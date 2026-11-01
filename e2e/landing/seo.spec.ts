import { expect, test } from '../fixtures';

// #249: what search engines and link previews read, straight from the HTML
// the server sends. CI builds the landing from its .env.example and the e2e
// service exports the same VITE_SITE_URL and VITE_PANEL_URL; nothing here
// names a domain of its own.
const SITE_URL = 'http://localhost:5176';
const PANEL_HOST = 'localhost:5174';

test('each page declares its absolute canonical and link preview', async ({
    request,
}) => {
    for (const [requested, canonical] of [
        ['/', `${SITE_URL}/`],
        ['/contacto?plan=centro', `${SITE_URL}/contacto`],
    ]) {
        const response = await request.get(requested);
        expect(response.status()).toBe(200);
        const html = await response.text();

        expect(html.match(/<link rel="canonical"/g)).toHaveLength(1);
        expect(html).toContain(`<link rel="canonical" href="${canonical}"/>`);
        expect(html).toContain(
            `<meta property="og:url" content="${canonical}"/>`,
        );
        expect(html).toMatch(/<meta property="og:title" content="[^"]+"\/>/);
        expect(html).toMatch(
            /<meta property="og:description" content="[^"]+"\/>/,
        );
        expect(html).toContain(
            `<meta property="og:image" content="${SITE_URL}/`,
        );
    }
});

test('the hero shows the booking link on the panel host', async ({
    request,
}) => {
    const html = await (await request.get('/')).text();

    // React separates the host from the rest of the text with a comment.
    expect(html.replace(/<!-- -->/g, '')).toContain(`${PANEL_HOST}/reservar/`);
});

test('serves the sitemap with every public page', async ({ request }) => {
    const response = await request.get('/sitemap.xml');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/xml');
    const xml = await response.text();
    expect(xml).toContain(`<loc>${SITE_URL}/</loc>`);
    expect(xml).toContain(`<loc>${SITE_URL}/contacto</loc>`);
});

test('serves robots.txt pointing at the absolute sitemap', async ({
    request,
}) => {
    const response = await request.get('/robots.txt');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');
    const text = await response.text();
    expect(text).toContain('Allow: /');
    expect(text).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
});
