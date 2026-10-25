import { OUTLINE, PauseBadge, Sparks } from './badge-parts';

// The badges of the errors that waiting, or the connection coming back, may fix.

export function Stopwatch({ hand }: { hand: string }) {
    return (
        <g>
            <rect
                x={156}
                y={76}
                width={14}
                height={8}
                rx={2}
                className={OUTLINE}
            />
            <circle cx={163} cy={116} r={30} className={OUTLINE} />
            {[0, 90, 180, 270].map((angle) => (
                <path
                    key={angle}
                    d="M163 92v5"
                    transform={`rotate(${angle} 163 116)`}
                    className="stroke-foreground"
                    strokeWidth={2}
                />
            ))}
            <path
                d={hand}
                className="fill-none stroke-primary"
                strokeWidth={3}
            />
            <circle
                cx={163}
                cy={116}
                r={3.5}
                className="fill-primary stroke-foreground"
                strokeWidth={1.5}
            />
        </g>
    );
}

export function RateLimited() {
    return (
        <g>
            {[86, 106, 126].map((y, index) => (
                <g key={y}>
                    <rect
                        x={146 + index * 4}
                        y={y}
                        width={50}
                        height={20}
                        rx={6}
                        className={OUTLINE}
                    />
                    <circle
                        cx={157 + index * 4}
                        cy={y + 10}
                        r={4}
                        className="fill-primary stroke-none"
                    />
                    <rect
                        x={166 + index * 4}
                        y={y + 7}
                        width={22}
                        height={6}
                        rx={3}
                        className="fill-accent stroke-none"
                    />
                </g>
            ))}
            <PauseBadge cx={138} cy={132} />
            <Sparks x={200} y={76} />
        </g>
    );
}

export function Gear() {
    return (
        <g>
            <circle
                cx={168}
                cy={128}
                r={19}
                className="fill-none stroke-foreground"
                strokeWidth={8}
                strokeDasharray="7 5"
                strokeLinecap="butt"
            />
            <circle cx={168} cy={128} r={16} className={OUTLINE} />
            <circle
                cx={168}
                cy={128}
                r={6}
                className="fill-glow stroke-foreground"
            />
            <rect
                x={150}
                y={78}
                width={22}
                height={20}
                rx={4}
                className="fill-primary stroke-foreground"
            />
            <Sparks x={178} y={74} />
        </g>
    );
}

export function Unavailable() {
    return (
        <g>
            <circle cx={163} cy={114} r={30} className={OUTLINE} />
            <path d="M163 96v18l11 7" className="fill-none stroke-foreground" />
            <PauseBadge cx={186} cy={136} />
        </g>
    );
}

export function Offline() {
    return (
        <g>
            <path
                d="M150 92a36 36 0 0 1 48 0"
                className="fill-none stroke-foreground"
                strokeWidth={4}
            />
            <path
                d="M158 102a24 24 0 0 1 32 0"
                className="fill-none stroke-muted-foreground"
                strokeWidth={4}
                strokeDasharray="4 6"
            />
            <circle
                cx={174}
                cy={114}
                r={5}
                className="fill-accent stroke-foreground"
            />
            <PauseBadge cx={196} cy={120} />
        </g>
    );
}
