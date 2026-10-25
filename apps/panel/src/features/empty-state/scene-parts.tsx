import type { ReactNode } from 'react';

// Pieces several empty-state scenes share. Drawn on the theme tokens, so they
// follow light and dark like the rest of the page.

export const OUTLINE = 'fill-card stroke-foreground';

/** A month calendar with its rings, the agenda every scheduling scene starts from. */
export function MonthCalendar({ x, y }: { x: number; y: number }) {
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={96}
                height={88}
                rx={10}
                className={OUTLINE}
            />
            <path
                d={`M${x} ${y + 20}v-10a10 10 0 0 1 10 -10h76a10 10 0 0 1 10 10v10z`}
                className="fill-accent stroke-foreground"
            />
            <path
                d={`M${x + 24} ${y - 8}v14M${x + 72} ${y - 8}v14`}
                className="stroke-foreground"
                strokeWidth={5}
            />
            {[0, 1, 2].flatMap((row) =>
                [0, 1, 2, 3].map((column) => (
                    <rect
                        key={`${row}-${column}`}
                        x={x + 12 + column * 20}
                        y={y + 30 + row * 18}
                        width={12}
                        height={11}
                        rx={2.5}
                        className={
                            row === 1 && column === 2
                                ? 'fill-none stroke-primary'
                                : 'fill-muted-foreground/25 stroke-none'
                        }
                        strokeWidth={1.5}
                        strokeDasharray={
                            row === 1 && column === 2 ? '3 2' : undefined
                        }
                    />
                )),
            )}
        </g>
    );
}

/** The round mark in a scene's corner: the step the empty state suggests. */
export function CornerBadge({
    cx,
    cy,
    children,
}: {
    cx: number;
    cy: number;
    children: ReactNode;
}) {
    return (
        <g>
            <circle
                cx={cx}
                cy={cy}
                r={17}
                className="fill-primary stroke-foreground"
            />
            <g className="fill-none stroke-primary-foreground" strokeWidth={3}>
                {children}
            </g>
        </g>
    );
}

/** Two chain links, the booking link the agenda's empty state offers to share. */
export function LinkGlyph({ cx, cy }: { cx: number; cy: number }) {
    return (
        <g transform={`rotate(-45 ${cx} ${cy})`}>
            <rect x={cx - 11} y={cy - 4.5} width={12} height={9} rx={4.5} />
            <rect x={cx - 1} y={cy - 4.5} width={12} height={9} rx={4.5} />
        </g>
    );
}

export function Sparks({ x, y }: { x: number; y: number }) {
    return (
        <g className="fill-none stroke-primary">
            <path d={`M${x} ${y}l3 -9`} />
            <path d={`M${x + 7} ${y + 6}l8 -6`} />
            <path d={`M${x + 9} ${y + 15}h9`} />
        </g>
    );
}

/** A person's bust inside a round frame. */
export function Person({ cx, cy, r }: { cx: number; cy: number; r: number }) {
    return (
        <g>
            <circle cx={cx} cy={cy} r={r} className={OUTLINE} />
            <circle
                cx={cx}
                cy={cy - r * 0.22}
                r={r * 0.28}
                className="fill-card stroke-foreground"
            />
            <path
                d={`M${cx - r * 0.55} ${cy + r * 0.62}a${r * 0.55} ${r * 0.5} 0 0 1 ${r * 1.1} 0`}
                className="fill-glow stroke-foreground"
            />
        </g>
    );
}
