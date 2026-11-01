import { THEME_STORAGE_KEY } from '@/hooks/use-theme';
import { brandMeta } from '@/lib/brand-head';
import { SITE_DESCRIPTION, SITE_TITLE } from '@/lib/page-head';
import { brandHeadLinks } from '@clini/brand';
import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import appCss from '../index.css?url';

// Runs before first paint so a saved dark theme doesn't flash light. Light
// is the default: the landing never follows the OS theme on its own.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});document.documentElement.classList.toggle('dark',t!==null&&JSON.parse(t)==='dark')}catch(e){}})();`;

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: 'utf-8' },
            {
                name: 'viewport',
                content:
                    'width=device-width, initial-scale=1, viewport-fit=cover',
            },
            // Defaults for pages without their own head (404, errors). A
            // public page declares its own through pageHead(), canonical
            // included, which only a page has.
            { title: SITE_TITLE },
            { name: 'description', content: SITE_DESCRIPTION },
            { property: 'og:type', content: 'website' },
            { property: 'og:locale', content: 'es_AR' },
            { property: 'og:title', content: SITE_TITLE },
            { property: 'og:description', content: SITE_DESCRIPTION },
            ...brandMeta(),
        ],
        links: [{ rel: 'stylesheet', href: appCss }, ...brandHeadLinks()],
        scripts: [{ children: THEME_SCRIPT }],
    }),
    shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
    return (
        // The theme script above may add `dark` before hydration.
        <html lang="es-AR" suppressHydrationWarning>
            <head>
                <HeadContent />
            </head>
            <body>
                {children}
                <Scripts />
            </body>
        </html>
    );
}
