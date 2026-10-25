import type { ReactElement } from 'react';
import { OUTLINE, Sparks } from './badge-parts';
import type { ErrorPageVariant } from './error-page-variant';
import {
    Gear,
    Offline,
    RateLimited,
    Stopwatch,
    Unavailable,
} from './service-badges';

// The object next to the calendar that tells each error apart. Drawn on the
// theme tokens, so it follows light and dark like the rest of the page.

function BadRequest() {
    return (
        <g>
            <rect
                x={140}
                y={86}
                width={52}
                height={62}
                rx={6}
                className={OUTLINE}
            />
            {[100, 115, 130].map((y) => (
                <rect
                    key={y}
                    x={150}
                    y={y}
                    width={32}
                    height={8}
                    rx={3}
                    className="fill-accent stroke-primary"
                    strokeWidth={1.5}
                />
            ))}
            <circle
                cx={190}
                cy={86}
                r={13}
                className="fill-warning stroke-foreground"
            />
            <path d="M190 79v8" className="stroke-foreground" />
            <circle
                cx={190}
                cy={92.5}
                r={1.5}
                className="fill-foreground stroke-none"
            />
            <Sparks x={202} y={70} />
        </g>
    );
}

function Unauthorized() {
    return (
        <g>
            <rect
                x={132}
                y={84}
                width={62}
                height={52}
                rx={6}
                className={OUTLINE}
            />
            <circle
                cx={163}
                cy={102}
                r={9}
                className="fill-accent stroke-primary"
                strokeWidth={2}
            />
            <rect
                x={142}
                y={118}
                width={42}
                height={9}
                rx={4}
                className="fill-muted stroke-foreground"
                strokeWidth={1.5}
            />
            <circle
                cx={190}
                cy={128}
                r={10}
                className="fill-primary stroke-foreground"
            />
            <circle
                cx={190}
                cy={128}
                r={3}
                className="fill-card stroke-foreground"
                strokeWidth={1.5}
            />
            <path
                d="M183 135l-17 17m4 -4l5 5m1 -11l5 5"
                className="fill-none stroke-primary"
                strokeWidth={5}
            />
        </g>
    );
}

function Forbidden() {
    return (
        <g>
            <path
                d="M164 82l28 10v20c0 18 -12 30 -28 36c-16 -6 -28 -18 -28 -36v-20z"
                className={OUTLINE}
            />
            <path
                d="M157 112v-6a7 7 0 0 1 14 0v6"
                className="fill-none stroke-foreground"
            />
            <rect
                x={152}
                y={111}
                width={24}
                height={20}
                rx={4}
                className="fill-primary stroke-foreground"
            />
            <circle
                cx={164}
                cy={121}
                r={2.5}
                className="fill-foreground stroke-none"
            />
        </g>
    );
}

function NotFound() {
    return (
        <g>
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
                d="M150 103a12 12 0 0 1 9 -6"
                className="fill-none stroke-card"
                strokeWidth={3}
            />
        </g>
    );
}

function SessionExpired() {
    return (
        <g>
            <path
                d="M190 96a32 32 0 1 0 2 34"
                className="fill-none stroke-primary"
                strokeWidth={4}
            />
            <path
                d="M184 88l8 9l-11 4"
                className="fill-none stroke-primary"
                strokeWidth={4}
            />
            <path
                d="M152 98h22m-22 34h22M155 98c0 12 16 12 16 17s-16 5 -16 17m16 -34c0 12 -16 12 -16 17s16 5 16 17"
                className="fill-card stroke-foreground"
            />
            <path d="M158 128l5 -6l5 6z" className="fill-accent stroke-none" />
        </g>
    );
}

export const ERROR_BADGES: Record<ErrorPageVariant, () => ReactElement> = {
    bad_request: BadRequest,
    unauthorized: Unauthorized,
    forbidden: Forbidden,
    not_found: NotFound,
    timeout: () => <Stopwatch hand="M163 116l11 -12" />,
    session_expired: SessionExpired,
    rate_limited: RateLimited,
    server: Gear,
    unavailable: Unavailable,
    offline: Offline,
};
