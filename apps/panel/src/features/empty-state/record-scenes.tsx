import { CornerBadge, OUTLINE, Sparks } from './scene-parts';

// The scenes about lists of records: what a search, a log or an inbox holds.

function ListRows({ x, y }: { x: number; y: number }) {
    return (
        <g>
            {[0, 1, 2].map((row) => (
                <g key={row}>
                    <circle
                        cx={x}
                        cy={y + row * 20}
                        r={4}
                        className="fill-primary stroke-none"
                    />
                    <rect
                        x={x + 10}
                        y={y + row * 20 - 3.5}
                        width={row === 0 ? 46 : 36}
                        height={7}
                        rx={3}
                        className="fill-muted-foreground/25 stroke-none"
                    />
                </g>
            ))}
        </g>
    );
}

export function SearchScene() {
    return (
        <g>
            <rect
                x={48}
                y={58}
                width={92}
                height={86}
                rx={10}
                className={OUTLINE}
            />
            <ListRows x={64} y={80} />
            <path
                d="M178 132l16 16"
                className="fill-none stroke-primary"
                strokeWidth={9}
            />
            <circle cx={160} cy={112} r={26} className={OUTLINE} />
            <circle
                cx={160}
                cy={112}
                r={19}
                className="fill-glow stroke-foreground"
                strokeWidth={1.5}
            />
            <path
                d="M153 105l14 14M167 105l-14 14"
                className="stroke-primary"
                strokeWidth={3}
            />
        </g>
    );
}

export function RecordsScene() {
    return (
        <g>
            <rect
                x={84}
                y={48}
                width={92}
                height={100}
                rx={10}
                className={OUTLINE}
            />
            <rect
                x={64}
                y={60}
                width={92}
                height={100}
                rx={10}
                className={OUTLINE}
            />
            <ListRows x={82} y={86} />
            <Sparks x={186} y={70} />
        </g>
    );
}

export function InboxScene() {
    return (
        <g>
            <rect
                x={92}
                y={50}
                width={58}
                height={40}
                rx={5}
                className={OUTLINE}
            />
            <path
                d="M97 56l24 17l24 -17"
                className="fill-none stroke-primary"
            />
            <path
                d="M60 112l18 -24h86l18 24v30a8 8 0 0 1 -8 8h-106a8 8 0 0 1 -8 -8z"
                className={OUTLINE}
            />
            <path
                d="M60 112h36l6 12h38l6 -12h36"
                className="fill-accent stroke-foreground"
            />
            <Sparks x={186} y={70} />
        </g>
    );
}

export function OrganizationsScene() {
    return (
        <g>
            <rect
                x={70}
                y={54}
                width={70}
                height={96}
                rx={6}
                className={OUTLINE}
            />
            <rect
                x={140}
                y={88}
                width={40}
                height={62}
                rx={6}
                className={OUTLINE}
            />
            {[0, 1, 2].flatMap((row) =>
                [0, 1].map((column) => (
                    <rect
                        key={`${row}-${column}`}
                        x={84 + column * 26}
                        y={68 + row * 20}
                        width={16}
                        height={11}
                        rx={2.5}
                        className="fill-accent stroke-none"
                    />
                )),
            )}
            <path
                d="M98 150v-20h14v20M150 104h20M150 118h20"
                className="fill-none stroke-foreground"
            />
            <CornerBadge cx={182} cy={138}>
                <path d="M182 130v16M174 138h16" />
            </CornerBadge>
        </g>
    );
}

export function PaymentsScene() {
    return (
        <g>
            <path
                d="M118 48h56v98l-7 -5l-7 5l-7 -5l-7 5l-7 -5l-7 5l-7 -5l-7 5z"
                className={OUTLINE}
            />
            {[64, 78, 92].map((y) => (
                <rect
                    key={y}
                    x={128}
                    y={y}
                    width={36}
                    height={6}
                    rx={3}
                    className="fill-muted-foreground/25 stroke-none"
                />
            ))}
            <rect
                x={50}
                y={92}
                width={96}
                height={58}
                rx={8}
                className={OUTLINE}
            />
            <path
                d="M50 108h96"
                className="stroke-foreground"
                strokeWidth={8}
            />
            <rect
                x={60}
                y={124}
                width={22}
                height={14}
                rx={3}
                className="fill-primary stroke-none"
            />
            <Sparks x={186} y={70} />
        </g>
    );
}
