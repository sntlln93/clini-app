import {
    CornerBadge,
    LinkGlyph,
    MonthCalendar,
    OUTLINE,
    Person,
    Sparks,
} from './scene-parts';

// The scenes about the agenda and the people in it.

const WEEK_COLUMNS = [0, 1, 2, 3, 4, 5, 6];

export function AgendaDayScene() {
    return (
        <g>
            <MonthCalendar x={44} y={56} />
            <circle cx={158} cy={114} r={30} className={OUTLINE} />
            {[0, 90, 180, 270].map((angle) => (
                <path
                    key={angle}
                    d="M158 90v5"
                    transform={`rotate(${angle} 158 114)`}
                    className="stroke-foreground"
                />
            ))}
            <path
                d="M158 98v16h11"
                className="fill-none stroke-primary"
                strokeWidth={3}
            />
            <CornerBadge cx={184} cy={140}>
                <LinkGlyph cx={184} cy={140} />
            </CornerBadge>
            <Sparks x={192} y={78} />
        </g>
    );
}

export function AgendaWeekScene() {
    return (
        <g>
            <rect
                x={36}
                y={56}
                width={140}
                height={88}
                rx={10}
                className={OUTLINE}
            />
            <path
                d="M36 76v-10a10 10 0 0 1 10 -10h120a10 10 0 0 1 10 10v10z"
                className="fill-accent stroke-foreground"
            />
            <path
                d="M60 48v14M106 48v14M152 48v14"
                className="stroke-foreground"
                strokeWidth={5}
            />
            {WEEK_COLUMNS.map((column) => (
                <g key={column}>
                    <rect
                        x={44 + column * 18.5}
                        y={84}
                        width={13}
                        height={9}
                        rx={2.5}
                        className="fill-muted-foreground/25 stroke-none"
                    />
                    {column > 0 && (
                        <path
                            d={`M${41 + column * 18.5} 84v52`}
                            className="stroke-muted-foreground/40"
                            strokeWidth={1.5}
                        />
                    )}
                </g>
            ))}
            <CornerBadge cx={176} cy={138}>
                <LinkGlyph cx={176} cy={138} />
            </CornerBadge>
            <Sparks x={184} y={76} />
        </g>
    );
}

export function TeamScene() {
    return (
        <g>
            <path
                d="M46 132c14 12 30 14 44 8M150 62c8 -12 20 -20 36 -20"
                className="fill-none stroke-muted-foreground"
                strokeWidth={1.5}
                strokeDasharray="4 5"
            />
            <circle cx={46} cy={132} r={5} className="fill-primary" />
            <circle cx={186} cy={42} r={5} className="fill-primary" />
            <Person cx={156} cy={88} r={24} />
            <Person cx={112} cy={112} r={34} />
            <rect
                x={136}
                y={124}
                width={40}
                height={28}
                rx={5}
                className="fill-primary stroke-foreground"
            />
            <path
                d="M141 130l15 11l15 -11"
                className="fill-none stroke-primary-foreground"
                strokeWidth={2.5}
            />
            <path
                d="M182 132h12m-4 -4l4 4l-4 4"
                className="fill-none stroke-primary"
            />
        </g>
    );
}

export function PatientsScene() {
    return (
        <g>
            <rect
                x={48}
                y={62}
                width={132}
                height={82}
                rx={10}
                className={OUTLINE}
            />
            <Person cx={84} cy={102} r={22} />
            {[88, 102, 116].map((y, index) => (
                <rect
                    key={y}
                    x={116}
                    y={y}
                    width={index === 0 ? 50 : 38}
                    height={7}
                    rx={3}
                    className={
                        index === 0
                            ? 'fill-accent stroke-primary'
                            : 'fill-muted-foreground/25 stroke-none'
                    }
                    strokeWidth={1.5}
                />
            ))}
            <CornerBadge cx={180} cy={140}>
                <path d="M180 132v16M172 140h16" />
            </CornerBadge>
            <Sparks x={186} y={70} />
        </g>
    );
}
