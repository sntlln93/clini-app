import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import {
    BRAND_BASE_PATH,
    brandFiles,
    brandHeadLinks,
    WEB_MANIFEST_FILE,
    webManifest,
} from './index.ts';

const ASSETS_DIR = path.join(import.meta.dirname, 'assets');

const CONTENT_TYPES: Record<string, string> = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
};

type BrandPluginOptions = {
    /** The name a saved shortcut shows (the web manifest's `name`). */
    appName: string;
};

/**
 * Publishes the files the manifest names, plus a web manifest, at `/brand/`
 * (served in dev, emitted in the client build) and adds the brand's `<head>` links to `index.html`.
 * The landing has no `index.html`: its root route reads the same links from
 * `brandHeadLinks()`.
 */
export function cliniBrand({ appName }: BrandPluginOptions): Plugin {
    const manifest = JSON.stringify(webManifest(appName), null, 2);

    // Only the manifest's files: a stray file in assets/ (an old name, a
    // .DS_Store) is never published, and a request path never reaches the disk.
    const files = [...brandFiles(), WEB_MANIFEST_FILE];

    // Read on every call, so a replaced file shows up without a restart.
    const read = (file: string): string | Buffer | null => {
        if (!files.includes(file)) {
            return null;
        }

        return file === WEB_MANIFEST_FILE
            ? manifest
            : readFileSync(path.join(ASSETS_DIR, file));
    };

    return {
        name: 'clini-brand',
        configureServer(server) {
            server.middlewares.use(BRAND_BASE_PATH, (req, res, next) => {
                // Not decoded: brand file names are plain ASCII, and a
                // malformed escape must fall through, not throw.
                const file = (req.url ?? '').split('?')[0].replace(/^\//, '');
                const body = read(file);

                if (body === null) {
                    next();
                    return;
                }

                res.setHeader(
                    'Content-Type',
                    CONTENT_TYPES[path.extname(file)] ??
                        'application/octet-stream',
                );
                res.end(body);
            });
        },
        generateBundle() {
            // TanStack Start also builds an SSR environment: the files only
            // belong with the browser's.
            if (this.environment.name !== 'client') {
                return;
            }

            for (const file of files) {
                this.emitFile({
                    type: 'asset',
                    fileName: `${BRAND_BASE_PATH.slice(1)}${file}`,
                    source: read(file) ?? '',
                });
            }
        },
        transformIndexHtml() {
            return brandHeadLinks().map((attrs) => ({
                tag: 'link',
                attrs,
                injectTo: 'head',
            }));
        },
    };
}
