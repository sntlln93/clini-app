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
} as const;

/**
 * The theme's typeface, registered by `loadPdfMake()` (regular, and medium
 * for `bold`).
 */
export const PDF_FONT = 'Outfit';
