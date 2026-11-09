/**
 * The light tokens of `@clini/theme` as plain values, for every PDF the panel
 * builds (ADR 0023): pdfmake can't read CSS variables. `theme.test.ts` checks
 * each against `theme.css`, so a token change fails there instead of drifting.
 * The translucent border is composited over the card's white.
 */
export const PDF_COLORS = {
    /** `--foreground`. */
    text: '#0f1a1b',
    /** `--muted-foreground`. */
    muted: '#5a6b6c',
    /** `--border` over `--card`. */
    border: '#e7e8e8',
    /** `--primary`, the brand teal. */
    primary: '#0d7179',
    /** `--secondary`, the soft surface. */
    surface: '#f3f8f7',
    /** `--accent`. */
    accent: '#d9eff0',
    /** `--accent-foreground`. */
    accentText: '#0d7179',
    /** `--success`. */
    success: '#197b4a',
    /** `--success-wash`. */
    successWash: '#e0f5e8',
    /** `--warning`. */
    warning: '#b97709',
    /** `--warning-wash`. */
    warningWash: '#fdf0d6',
    /** `--status-scheduled`, also cancelled and rescheduled (`STATUS_TONES`). */
    statusScheduled: '#5d6b6c',
    /** `--status-scheduled-wash`. */
    statusScheduledWash: '#eef2f2',
    /** `--status-confirmed`. */
    statusConfirmed: '#0d7179',
    /** `--status-confirmed-wash`. */
    statusConfirmedWash: '#d9eff0',
    /** `--status-arrived`. */
    statusArrived: '#197b4a',
    /** `--status-arrived-wash`. */
    statusArrivedWash: '#e0f5e8',
    /** `--status-completed`. */
    statusCompleted: '#0f1a1b',
    /** `--status-completed-wash`. */
    statusCompletedWash: '#e6eaea',
    /** `--status-no-show`. */
    statusNoShow: '#ab302b',
    /** `--status-no-show-wash`. */
    statusNoShowWash: '#fde9e7',
    /** `--card`, a card's own white. */
    card: '#ffffff',
} as const;

/**
 * The theme's typeface, registered by `loadPdfMake()` (regular, and medium
 * for `bold`).
 */
export const PDF_FONT = 'Outfit';
