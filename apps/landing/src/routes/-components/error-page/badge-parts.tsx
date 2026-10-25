// Pieces several badges share. Drawn on the theme tokens, so they follow
// light and dark like the rest of the page.

export const OUTLINE = 'fill-card stroke-foreground';

export function Sparks({ x, y }: { x: number; y: number }) {
    return (
        <g className="fill-none stroke-primary">
            <path d={`M${x} ${y}l3 -9`} />
            <path d={`M${x + 7} ${y + 6}l8 -6`} />
            <path d={`M${x + 9} ${y + 15}h9`} />
        </g>
    );
}
