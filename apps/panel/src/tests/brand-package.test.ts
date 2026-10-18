/// <reference types="node" />
import {
    brand,
    brandAssetUrl,
    brandFiles,
    brandHeadLinks,
    WEB_MANIFEST_FILE,
} from '@clini/brand';
import { cliniBrand } from '@clini/brand/vite';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// The package has no test runner of its own; the panel covers it (#236).
const ASSETS_DIR = path.join(
    path.dirname(createRequire(import.meta.url).resolve('@clini/brand')),
    'assets',
);
// The `panel` dev container mounts only apps/panel, so apps/api is absent
// there — like error-code-parity.test.ts, this only runs in CI/host.
const BRAND_CONFIG_PATH = path.resolve(
    __dirname,
    '../../../api/config/brand.php',
);

/** What is in assets/, minus OS junk like a .DS_Store. */
function assetsOnDisk(): string[] {
    return readdirSync(ASSETS_DIR).filter((file) => !file.startsWith('.'));
}

/** A PNG's pixel size, from its IHDR chunk. */
function pngSize(file: string): { width: number; height: number } {
    const png = readFileSync(path.join(ASSETS_DIR, file));

    return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

type Emitted = { fileName: string; source: string | Uint8Array };

function emittedBy(environment: string): Emitted[] {
    const emitFile = vi.fn<(file: Emitted) => void>();
    const generateBundle = cliniBrand({ appName: 'Clini' })
        .generateBundle as unknown as (this: unknown) => void;
    generateBundle.call({ environment: { name: environment }, emitFile });

    return emitFile.mock.calls.map(([file]) => file);
}

describe('@clini/brand', () => {
    it('names exactly the files in assets/', () => {
        // A file the manifest no longer names is a leftover from a swap.
        expect(brandFiles().length).toBeGreaterThan(0);
        expect([...brandFiles()].sort()).toEqual(assetsOnDisk().sort());
    });

    it('marks every file as a placeholder until the final design', () => {
        expect(
            brandFiles().filter((file) => !file.includes('.placeholder.')),
        ).toEqual([]);
    });

    it('declares the real size of each sized PNG', () => {
        const { ogImage, pwaIcons, appleTouchIcon } = brand.assets;

        expect(pngSize(ogImage.file)).toEqual({
            width: ogImage.width,
            height: ogImage.height,
        });
        for (const { file, size } of pwaIcons) {
            expect(pngSize(file)).toEqual({ width: size, height: size });
        }
        expect(pngSize(appleTouchIcon)).toEqual({ width: 180, height: 180 });
    });

    it('adds the head links to index.html', () => {
        const transformIndexHtml = cliniBrand({ appName: 'Clini' })
            .transformIndexHtml as unknown as () => Array<{
            attrs: Record<string, string>;
        }>;

        expect(transformIndexHtml().map((tag) => tag.attrs)).toEqual(
            brandHeadLinks(),
        );
        expect(brandHeadLinks().map((link) => link.href)).toEqual([
            brandAssetUrl(brand.assets.favicon.ico),
            brandAssetUrl(brand.assets.favicon.svg),
            brandAssetUrl(brand.assets.appleTouchIcon),
            brandAssetUrl(WEB_MANIFEST_FILE),
        ]);
    });

    it("serves in dev only the manifest's files, passing anything else on", () => {
        type Middleware = (
            req: { url: string },
            res: {
                setHeader: (name: string, value: string) => void;
                end: (body: unknown) => void;
            },
            next: () => void,
        ) => void;
        let middleware: Middleware | undefined;
        const configureServer = cliniBrand({ appName: 'Clini' })
            .configureServer as unknown as (server: unknown) => void;
        configureServer({
            middlewares: {
                use: (_path: string, handler: Middleware) => {
                    middleware = handler;
                },
            },
        });
        const request = (url: string) => {
            const res = { setHeader: vi.fn(), end: vi.fn() };
            const next = vi.fn();
            middleware?.({ url }, res, next);
            return { res, next };
        };

        const served = request(`/${brand.assets.favicon.svg}?v=1`);
        expect(served.res.setHeader).toHaveBeenCalledWith(
            'Content-Type',
            'image/svg+xml',
        );
        expect(served.next).not.toHaveBeenCalled();
        // A malformed escape, a path outside assets/ and an unknown name
        // all fall through to the app instead of failing or reading disk.
        for (const url of ['/%E0%A4%A', '/..%2Fpackage.json', '/nope.png']) {
            const { res, next } = request(url);
            expect(next).toHaveBeenCalledOnce();
            expect(res.end).not.toHaveBeenCalled();
        }
    });

    it('emits every asset and the web manifest in the client build only', () => {
        const emitted = emittedBy('client');

        expect(emitted.map((file) => file.fileName).sort()).toEqual(
            [...brandFiles(), WEB_MANIFEST_FILE]
                .map((file) => `brand/${file}`)
                .sort(),
        );
        expect(emittedBy('ssr')).toEqual([]);

        const manifest = emitted.find(
            (file) => file.fileName === `brand/${WEB_MANIFEST_FILE}`,
        );
        expect(JSON.parse(String(manifest?.source))).toMatchObject({
            name: 'Clini',
            icons: brand.assets.pwaIcons.map(({ file, size }) => ({
                src: brandAssetUrl(file),
                sizes: `${size}x${size}`,
            })),
        });
    });

    it("points the API's default mail logo at the manifest's file", () => {
        if (!existsSync(BRAND_CONFIG_PATH)) {
            if (process.env.CI === 'true') {
                throw new Error(
                    `Expected to find ${BRAND_CONFIG_PATH} under CI, but it was unreachable.`,
                );
            }

            return;
        }

        expect(readFileSync(BRAND_CONFIG_PATH, 'utf-8')).toContain(
            `'${brandAssetUrl(brand.assets.mailLogo)}'`,
        );
    });
});
