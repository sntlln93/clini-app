// Pieces several badges share. Drawn on the theme tokens, so they follow
// light and dark like the rest of the page.

export const OUTLINE = 'fill-card stroke-foreground';

export function PauseBadge({ cx, cy }: { cx: number; cy: number }) {
    return (
        <g>
            <circle
                cx={cx}
                cy={cy}
                r={14}
                className="fill-primary stroke-foreground"
            />
            <rect
                x={cx - 6}
                y={cy - 6}
                width={4}
                height={12}
                rx={1.5}
                className="fill-primary-foreground"
            />
            <rect
                x={cx + 2}
                y={cy - 6}
                width={4}
                height={12}
                rx={1.5}
                className="fill-primary-foreground"
            />
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
