import type { ReactNode } from 'react';

// One column on a phone, two on a tablet, three on a desktop (#306).
export function CardGrid({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <ul
            aria-label={label}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
            {children}
        </ul>
    );
}
