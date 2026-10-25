/// <reference types="node" />
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// A floating tag keeps whatever patch a cached layer holds and lets a new one
// in without a diff (#349). The `panel` dev container mounts only apps/panel,
// so this only resolves in CI, where it fails loudly instead of being skipped.
const ROOT = path.resolve(__dirname, '../../../..');

// Built locally by Sail from apt (ondrej's PPA): no tag can pin its patch.
const LOCAL_IMAGES = new Set(['sail-8.5/app']);

const PATCH_TAG = /:v?\d+\.\d+\.\d+(-[\w.-]+)?$/;

// Postgres numbers its releases major.minor: the minor is the patch.
const POSTGRES_TAG = /^postgres:\d+\.\d+(-[\w.-]+)?$/;

function isPinned(image: string): boolean {
    return (
        LOCAL_IMAGES.has(image) ||
        PATCH_TAG.test(image) ||
        POSTGRES_TAG.test(image)
    );
}

function filesIn(dir: string, matches: (name: string) => boolean): string[] {
    const absolute = path.join(ROOT, dir);
    if (!existsSync(absolute)) {
        return [];
    }

    return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
        const relative = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return filesIn(relative, matches);
        }

        return matches(entry.name) ? [relative] : [];
    });
}

function runtimeFiles(): string[] {
    const apps = readdirSync(path.join(ROOT, 'apps')).flatMap((app) =>
        ['Dockerfile', 'compose.yaml']
            .map((name) => path.join('apps', app, name))
            .filter((file) => existsSync(path.join(ROOT, file))),
    );

    return [
        'compose.yaml',
        ...apps,
        ...filesIn('.github', (name) => /\.ya?ml$/.test(name)),
    ];
}

function imagesIn(source: string): string[] {
    const from = [...source.matchAll(/^FROM\s+(\S+)/gm)];
    const image = [...source.matchAll(/^\s*image:\s*['"]?([^'"\s]+)/gm)];

    return [...from, ...image].map((match) => match[1]);
}

// Disposable-container commands: no FROM or image: line, and Dependabot never
// bumps them, so only this test keeps their Node in step.
const COMMAND_FILES = [
    'CLAUDE.md',
    'docs/architecture/development.md',
    '.claude/skills/run-forensics/scripts/run-forensics.sh',
];

function nodeTagsIn(source: string): string[] {
    return [...source.matchAll(/\bnode:\d[\w.-]*/g)].map((match) => match[0]);
}

function read(file: string): string {
    return readFileSync(path.join(ROOT, file), 'utf-8');
}

describe('runtime versions', () => {
    const reachable = existsSync(path.join(ROOT, 'apps/api/Dockerfile'));

    if (!reachable && process.env.CI === 'true') {
        throw new Error(
            `Expected the repo root at ${ROOT} under CI, but it was unreachable. ` +
                'A skip here would silently let a floating image tag through.',
        );
    }

    it.skipIf(!reachable)('pins every Docker image down to the patch', () => {
        // Guards against a regex that stopped matching: no image, no failure.
        for (const file of runtimeFiles().filter((f) =>
            f.endsWith('Dockerfile'),
        )) {
            expect(imagesIn(read(file)), file).not.toEqual([]);
        }

        const floating = runtimeFiles().flatMap((file) =>
            imagesIn(read(file))
                .filter((image) => !isPinned(image))
                .map((image) => `${file}: ${image}`),
        );

        expect(floating).toEqual([]);
    });

    it.skipIf(!reachable)(
        'runs the same Node everywhere, pinned down to the patch',
        () => {
            const images = [
                ...runtimeFiles().flatMap((file) =>
                    imagesIn(read(file)).filter((image) =>
                        image.startsWith('node:'),
                    ),
                ),
                ...COMMAND_FILES.flatMap((file) => nodeTagsIn(read(file))),
            ];
            const versions = new Set(
                images.map((image) => image.replace(/^node:([^-]+)-.*$/, '$1')),
            );
            const ci = read('.github/actions/setup-node/action.yml').match(
                /node-version:\s*'([^']+)'/,
            );

            expect(images.length).toBeGreaterThan(0);
            expect(ci?.[1]).toMatch(/^\d+\.\d+\.\d+$/);
            expect([...versions]).toEqual([ci?.[1]]);
        },
    );

    // Dependabot bumps the compose files but not the workflow's services.
    it.skipIf(!reachable)('runs the same Postgres everywhere', () => {
        const images = runtimeFiles().flatMap((file) =>
            imagesIn(read(file)).filter((image) =>
                image.startsWith('postgres:'),
            ),
        );

        expect(images.length).toBeGreaterThan(1);
        expect(new Set(images).size).toBe(1);
    });

    it.skipIf(!reachable)(
        'pins Composer in CI, where setup-php only takes PHP major.minor',
        () => {
            const action = read('.github/actions/setup-php/action.yml');

            expect(action).toMatch(/tools:\s*composer:\d+\.\d+\.\d+\b/);
        },
    );
});
