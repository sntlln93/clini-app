import { useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, type RefObject } from 'react';

/**
 * After an SPA navigation, the previously focused element unmounts and focus
 * falls back to `<body>`, stranding keyboard users. Never fires on the
 * initial mount or for a search-param/hash-only change.
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
