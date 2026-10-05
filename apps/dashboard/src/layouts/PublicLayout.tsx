import { useRouteFocus } from '@/hooks/use-route-focus';
import { Outlet } from '@tanstack/react-router';
import { useRef } from 'react';

export function PublicLayout() {
    const containerRef = useRef<HTMLElement>(null);
    useRouteFocus(containerRef);

    return (
        <main
            ref={containerRef}
            tabIndex={-1}
            className="flex min-h-svh w-full items-center justify-center bg-background p-4"
        >
            <Outlet />
        </main>
    );
}
