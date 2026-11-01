import { robotsTxt } from '@/lib/site';
import { createFileRoute } from '@tanstack/react-router';

// A server route instead of a file in public/, so its Sitemap: line can be
// absolute without writing the domain anywhere.
export const Route = createFileRoute('/robots.txt')({
    server: {
        handlers: {
            GET: () =>
                new Response(robotsTxt(), {
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                }),
        },
    },
});
