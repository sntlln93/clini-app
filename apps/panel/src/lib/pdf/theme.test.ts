/// <reference types="node" />
import { createPalette } from '@/tests/contrast';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
    statusScheduled: 'status-scheduled',
    statusScheduledWash: 'status-scheduled-wash',
    statusConfirmed: 'status-confirmed',
    statusConfirmedWash: 'status-confirmed-wash',
    statusArrived: 'status-arrived',
    statusArrivedWash: 'status-arrived-wash',
    statusCompleted: 'status-completed',
    statusCompletedWash: 'status-completed-wash',
    statusNoShow: 'status-no-show',
    statusNoShowWash: 'status-no-show-wash',
    card: 'card',
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

// Every PDF of the panel takes its colors from PDF_COLORS (#432): a color
// written in a PDF module drifts from the theme unseen.
describe('the PDF modules', () => {
    const lib = join(dirname(fileURLToPath(import.meta.url)), '..');
    const sources = ['pdf', 'clinical-record-pdf', 'invoice-pdf'].flatMap(
        (folder) =>
            readdirSync(join(lib, folder))
                .filter(
                    (file) =>
                        file.endsWith('.ts') &&
                        !file.endsWith('.test.ts') &&
                        !(folder === 'pdf' && file === 'theme.ts'),
                )
                .map((file) => `${folder}/${file}`),
    );

    it.each(sources)('%s writes no color of its own', (source) => {
        expect(readFileSync(join(lib, source), 'utf-8')).not.toMatch(
            /['"`]#[0-9a-f]{3,8}['"`]|rgba?\(/i,
        );
    });
});
