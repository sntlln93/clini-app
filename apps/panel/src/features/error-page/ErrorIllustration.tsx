import { ERROR_BADGES } from './error-badges';
import type { ErrorPageVariant } from './error-page-variant';

const GRID = [0, 1, 2].flatMap((row) =>
    [0, 1, 2, 3].map((column) => ({ row, column })),
);

/** The agenda every error page shares, with the object that tells the error apart. Decorative: the heading says it in words. */
export function ErrorIllustration({ variant }: { variant: ErrorPageVariant }) {
    const Badge = ERROR_BADGES[variant];

    return (
        <svg
            viewBox="0 0 240 200"
            aria-hidden="true"
            focusable="false"
            className="h-auto w-56 sm:w-64"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx={120} cy={100} r={96} className="fill-glow" />
            <ellipse
                cx={112}
                cy={156}
                rx={70}
                ry={8}
                className="fill-accent opacity-70"
            />
            <path
                d="M40 140c18 14 52 12 74 -6M150 70c10 -14 22 -24 40 -26"
                className="fill-none stroke-muted-foreground"
                strokeWidth={1.5}
                strokeDasharray="4 5"
            />
            <circle cx={40} cy={140} r={5} className="fill-primary" />
            <circle cx={190} cy={44} r={5} className="fill-primary" />
            <rect
                x={52}
                y={56}
                width={96}
                height={88}
                rx={10}
                className="fill-card stroke-foreground"
            />
            <path
                d="M52 76v-10a10 10 0 0 1 10 -10h76a10 10 0 0 1 10 10v10z"
                className="fill-accent stroke-foreground"
            />
            <path
                d="M76 48v14M124 48v14"
                className="stroke-foreground"
                strokeWidth={5}
            />
            {GRID.map(({ row, column }) => (
                <rect
                    key={`${row}-${column}`}
                    x={64 + column * 20}
                    y={86 + row * 18}
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
            ))}
            <Badge />
        </svg>
    );
}
