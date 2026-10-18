/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// #236: the brand's file paths live only in @clini/brand's manifest. One
// written by hand here would keep pointing at the old file after a swap.
const APP_ROOT = path.resolve(__dirname, '../..');
const BRAND_PATH =
    /\/brand\/|favicon|apple-touch-icon|\.webmanifest|\.placeholder\.|icons\.svg/i;

function sourceFiles(): string[] {
    const src = readdirSync(path.join(APP_ROOT, 'src'), {
        recursive: true,
        encoding: 'utf8',
    })
        .filter((file) => /\.(tsx?|css)$/.test(file))
        .filter((file) => !file.endsWith('routeTree.gen.ts'))
        .map((file) => path.join('src', file))
        // The brand's own tests name its paths on purpose.
        .filter((file) => !/^src\/tests\/brand-[\w-]+\.test\.ts$/.test(file));

    // Server-rendered: no index.html, the root route builds the <head>.
    return src;
}

describe('brand paths', () => {
    it('writes no brand path outside the manifest', () => {
        const offenders = sourceFiles().filter((file) =>
            BRAND_PATH.test(readFileSync(path.join(APP_ROOT, file), 'utf-8')),
        );

        expect(offenders).toEqual([]);
    });

    it('keeps no brand or template file in public/', () => {
        expect(
            readdirSync(path.join(APP_ROOT, 'public')).filter(
                (file) => !file.startsWith('.'),
            ),
        ).toEqual(['robots.txt']);
    });
});
