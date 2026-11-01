import { sitemapXml } from '@/lib/site';
import { createFileRoute } from '@tanstack/react-router';

// Served by the server, never rendered: the sitemap's URLs are absolute, so
// a build without VITE_SITE_URL has none to list.
export const Route = createFileRoute('/sitemap.xml')({
    server: {
        handlers: {
            GET: () => {
                const xml = sitemapXml();

                return xml === null
                    ? new Response(null, { status: 404 })
                    : new Response(xml, {
                          headers: {
                              'Content-Type': 'application/xml; charset=utf-8',
                          },
                      });
            },
        },
    },
});
