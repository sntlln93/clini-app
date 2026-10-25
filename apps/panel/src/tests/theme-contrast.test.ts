/// <reference types="node" />
import { buttonVariants } from '@/components/ui/button';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { createPalette, type Theme } from './contrast';

// WCAG 2.1 AA over the @clini/theme palette (#254), the same pairs the three
// apps render: 4.5:1 for text (1.4.3), 3:1 for meaningful graphics (1.4.11).
const TEXT = 4.5;
const GRAPHIC = 3;
// Not a WCAG minimum: our floor for two chart series drawn side by side,
// which the legend tells apart by color alone.
const NEIGHBOR_SERIES = 2;

// Read from disk: Vitest stubs every CSS import, `?raw` included.
const themeCss = readFileSync(
    createRequire(import.meta.url).resolve('@clini/theme/theme.css'),
    'utf-8',
);
const { contrast } = createPalette(themeCss);

/** The opacity a Tailwind utility like `hover:bg-primary/90` applies. */
function opacityOf(classes: string, utility: string): string {
    const match = classes
        .split(/[\s;]+/)
        .find((name) => name.startsWith(`${utility}/`));
    if (match === undefined) {
        throw new Error(`No "${utility}/…" class in: ${classes}`);
    }
    return match.slice(utility.length + 1);
}

const primaryButton = buttonVariants({ variant: 'default' });
// The `focus-ring` utility's 3px halo, the visible focus indicator.
const focusHalo = opacityOf(
    themeCss.match(/@utility focus-ring \{[^}]*\}/)?.[0] ?? '',
    'ring-ring',
);
const destructiveButton = buttonVariants({ variant: 'destructive' });

// Dialog footers are `bg-muted/50` over the popover.
const DIALOG_FOOTER = 'muted/50 over popover';

type Pair = {
    fg: string;
    bg: string;
    min: number;
    /** Only for a state that exists in one theme (e.g. a `dark:` variant). */
    themes?: Theme[];
};

const SURFACES = ['card', 'background', 'popover'];
const STATUSES = ['scheduled', 'confirmed', 'arrived', 'completed', 'no-show'];

const PAIRS: Pair[] = [
    // Brand: buttons, links, sidebar and menu highlights, selected day.
    { fg: 'primary-foreground', bg: 'primary', min: TEXT },
    {
        fg: 'primary-foreground',
        bg: `primary/${opacityOf(primaryButton, 'hover:bg-primary')}`,
        min: TEXT,
    },
    { fg: 'accent-foreground', bg: 'accent', min: TEXT },
    { fg: 'sidebar-accent-foreground', bg: 'sidebar-accent', min: TEXT },
    ...[...SURFACES, 'muted', 'secondary', 'accent'].map((bg) => ({
        fg: 'primary',
        bg,
        min: TEXT,
    })),
    ...[...SURFACES, 'muted', 'secondary', 'accent'].map((bg) => ({
        fg: 'muted-foreground',
        bg,
        min: TEXT,
    })),
    { fg: 'secondary-foreground', bg: 'secondary', min: TEXT },
    ...SURFACES.map((bg) => ({
        fg: `ring/${focusHalo}`,
        bg,
        min: GRAPHIC,
    })),
    // The landing's featured plan card dims its secondary copy to 85%.
    { fg: 'primary-foreground/85', bg: 'primary', min: TEXT },

    // Feedback: StatusPill tones, inline errors, Alert, destructive actions.
    ...['success-wash', 'card', 'secondary'].map((bg) => ({
        fg: 'success',
        bg,
        min: TEXT,
    })),
    { fg: 'foreground', bg: 'warning-wash', min: TEXT },
    // The error pages' debug trace (#304).
    { fg: 'foreground', bg: 'muted', min: TEXT },
    ...['card', 'warning-wash'].map((bg) => ({
        fg: 'warning',
        bg,
        min: GRAPHIC,
    })),
    ...[...SURFACES, 'destructive-wash'].map((bg) => ({
        fg: 'destructive',
        bg,
        min: TEXT,
    })),
    { fg: 'destructive/90', bg: 'card', min: TEXT },
    {
        fg: 'destructive',
        bg: 'destructive/10 over popover',
        min: TEXT,
        themes: ['light'],
    },
    {
        fg: 'destructive',
        bg: 'destructive/20 over popover',
        min: TEXT,
    },
    ...(['light', 'dark'] as const)
        .map((theme) => {
            const prefix = theme === 'dark' ? 'dark:' : '';
            const rest = opacityOf(
                destructiveButton,
                `${prefix}bg-destructive`,
            );
            const hover = opacityOf(
                destructiveButton,
                `${prefix}hover:bg-destructive`,
            );
            return [rest, hover].map((opacity) => ({
                fg: 'destructive',
                bg: `destructive/${opacity} over ${DIALOG_FOOTER}`,
                min: TEXT,
                themes: [theme],
            }));
        })
        .flat(),

    // Appointment status chips: on their wash (pill) and on the card.
    ...[...STATUSES, 'online'].flatMap((status) => [
        { fg: `status-${status}`, bg: `status-${status}-wash`, min: TEXT },
        { fg: `status-${status}`, bg: 'card', min: TEXT },
    ]),

    // Dashboard charts: every series against the surfaces it's drawn on,
    // and against its neighbor, which shares a stacked bar or a line chart.
    ...[1, 2, 3, 4, 5].flatMap((series) =>
        ['card', 'background'].map((bg) => ({
            fg: `chart-${series}`,
            bg,
            min: GRAPHIC,
        })),
    ),
    ...[1, 2, 3, 4].map((series) => ({
        fg: `chart-${series + 1}`,
        bg: `chart-${series}`,
        min: NEIGHBOR_SERIES,
    })),
];

describe('@clini/theme palette contrast (WCAG AA)', () => {
    const cases = PAIRS.flatMap((pair) =>
        (pair.themes ?? (['light', 'dark'] as const)).map((theme) => ({
            ...pair,
            theme,
        })),
    );

    it.each(cases)(
        '$theme: $fg on $bg reaches $min:1',
        ({ theme, fg, bg, min }) => {
            expect(contrast(theme, fg, bg)).toBeGreaterThanOrEqual(min);
        },
    );
});
