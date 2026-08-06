import { useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, type RefObject } from 'react';

/**
 * Moves focus to a route's content container whenever the pathname changes,
 * so a keyboard user isn't left with focus on an unmounted element (which
 * falls back to `<body>`) after an SPA navigation. Never fires on the
 * initial mount, and never fires for a search-param/hash-only change.
 */
export function useRouteFocus(ref: RefObject<HTMLElement | null>): void {
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    const previousPathname = useRef(pathname);

    useEffect(() => {
        if (previousPathname.current === pathname) {
            return;
        }

        previousPathname.current = pathname;
        ref.current?.focus({ preventScroll: true });
    }, [pathname, ref]);
}
