import { THEME_STORAGE_KEY } from '@/hooks/use-theme';
import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import appCss from '../index.css?url';

const TITLE = 'Clini · Turnos online para tu consultorio';
const DESCRIPTION =
    'Turnos online para profesionales y consultorios: agenda, reserva online, recordatorios por mail y sala de espera en un solo lugar.';

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
            { title: TITLE },
            { name: 'description', content: DESCRIPTION },
            { name: 'theme-color', content: '#0f7f88' },
            { property: 'og:type', content: 'website' },
            { property: 'og:locale', content: 'es_AR' },
            { property: 'og:title', content: TITLE },
            { property: 'og:description', content: DESCRIPTION },
        ],
        links: [
            { rel: 'stylesheet', href: appCss },
            { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        ],
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
