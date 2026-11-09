/// <reference types="node" />
import { createPalette } from '@/tests/contrast';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { PDF_COLORS } from './theme';

// Read from disk: Vitest stubs every CSS import, `?raw` included.
const { hex } = createPalette(
    readFileSync(
        createRequire(import.meta.url).resolve('@clini/theme/theme.css'),
        'utf-8',
    ),
);

// The light token each PDF color copies; a translucent one, over the card.
const TOKENS: Record<keyof typeof PDF_COLORS, string> = {
    text: 'foreground',
    muted: 'muted-foreground',
    border: 'border over card',
    primary: 'primary',
    surface: 'secondary',
    accent: 'accent',
    accentText: 'accent-foreground',
    success: 'success',
    successWash: 'success-wash',
    warning: 'warning',
    warningWash: 'warning-wash',
};

describe('PDF_COLORS', () => {
    it.each(Object.entries(TOKENS))(
        '%s is the light theme’s %s',
        (name, token) => {
            expect(PDF_COLORS[name as keyof typeof PDF_COLORS]).toBe(
                hex('light', token),
            );
        },
    );
});
