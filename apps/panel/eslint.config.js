import js from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tailwindCanonical from 'eslint-plugin-tailwind-canonical-classes';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Shared by every `no-restricted-imports` block below that needs to keep
// the axios restriction alongside its own, unrelated `patterns`/`paths` —
// see the comments at each call site for why this can't just be one more
// standalone config object.
const AXIOS_IMPORT_RESTRICTION = {
    name: 'axios',
    message:
        'Only src/lib/api-errors.ts (and src/lib/api.ts) may import axios directly — use mapToAppError() instead.',
};

export default tseslint.config(
    {
        ignores: [
            'node_modules/',
            'dist/',
            'test-results/',
            'playwright-report/',
            'src/routeTree.gen.ts',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    react.configs.flat.recommended,
    reactHooks.configs.flat.recommended,
    prettierRecommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
            'no-console': 'error',
        },
    },
    // The panel is a client-rendered SPA with no SSR/RSC (see ADR 0001), so
    // Next.js-style `'use client'`/`'use server'` directives are meaningless
    // here — ban both, with no exempt folders.
    {
        files: ['src/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: "ExpressionStatement[directive='use client']",
                    message:
                        "'use client' is meaningless: the panel is a client-rendered SPA with no SSR/RSC.",
                },
                {
                    selector: "ExpressionStatement[directive='use server']",
                    message:
                        "'use server' is meaningless: the panel is a client-rendered SPA with no SSR/RSC.",
                },
            ],
        },
    },
    // Structural limits from CLAUDE.md's "Frontend structure": every file
    // stays under 250 lines so heavy logic moves into hooks and
    // sub-components. Vendored shadcn primitives and tests are exempt.
    {
        files: ['src/**/*.{ts,tsx}'],
        ignores: [
            'src/components/ui/**',
            'src/**/*.test.{ts,tsx}',
            'src/**/tests/**',
        ],
        rules: {
            'max-lines': [
                'error',
                { max: 250, skipBlankLines: false, skipComments: false },
            ],
        },
    },
    // Components stay presentational and under 150 lines; business logic
    // lives in hooks (`.ts`), which the file-length limit above already
    // bounds.
    {
        files: ['src/**/*.tsx'],
        ignores: [
            'src/components/ui/**',
            'src/**/*.test.tsx',
            'src/**/tests/**',
        ],
        rules: {
            'max-lines-per-function': [
                'error',
                { max: 150, skipBlankLines: true, skipComments: true },
            ],
        },
    },
    // Enforce canonical Tailwind class names via Tailwind v4's
    // canonicalization API. Vendored shadcn primitives are exempt so
    // upstream updates don't drift.
    {
        files: ['src/**/*.{ts,tsx}'],
        ignores: ['src/components/ui/**'],
        plugins: {
            'tailwind-canonical-classes': tailwindCanonical,
        },
        rules: {
            'tailwind-canonical-classes/tailwind-canonical-classes': [
                'error',
                { cssPath: './src/index.css' },
            ],
        },
    },
    // Only `api-errors.ts` is allowed to know about axios (`isAxiosError`,
    // `error.response`) — everything else works with the typed `AppError`
    // union from `mapToAppError`. `api.ts` is exempt since it only creates
    // the axios instance and never reads `error.response`. `src/components/`
    // gets the same restriction folded into its own `no-restricted-imports`
    // blocks below instead of a separate one here: flat config replaces a
    // rule's entire options array per matching file rather than merging
    // config objects that target the same rule on overlapping files, so a
    // second, later `no-restricted-imports` block for `src/components/**`
    // would otherwise silently drop this restriction there (verified with
    // `eslint --print-config`).
    {
        files: ['src/**/*.{ts,tsx}'],
        ignores: [
            'src/lib/api-errors.ts',
            'src/lib/api.ts',
            'src/components/**',
        ],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [AXIOS_IMPORT_RESTRICTION],
                },
            ],
        },
    },
    // Import boundary: vendored ui/ primitives must stay domain-agnostic —
    // no reaching into routes, features or layouts. Also carries the axios
    // restriction above (see the comment there for why it's folded in here
    // instead of applied as a separate, later block).
    {
        files: ['src/components/ui/**'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [AXIOS_IMPORT_RESTRICTION],
                    patterns: [
                        {
                            group: [
                                '@/routes/*',
                                '@/routes/**',
                                '@/features/*',
                                '@/features/**',
                                '@/layouts/*',
                                '@/layouts/**',
                            ],
                            message:
                                'components/ui/ must stay domain-agnostic (no routes/features/layouts imports).',
                        },
                    ],
                },
            ],
        },
    },
    // Import boundary: root components/ are atomic and shared, without
    // domain or layout awareness — composed/domain-aware components belong
    // in features/. Also carries the axios restriction (see above).
    {
        files: ['src/components/**'],
        ignores: ['src/components/ui/**'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    paths: [AXIOS_IMPORT_RESTRICTION],
                    patterns: [
                        {
                            group: [
                                '@/routes/*',
                                '@/routes/**',
                                '@/features/*',
                                '@/features/**',
                                '@/layouts/*',
                                '@/layouts/**',
                            ],
                            message:
                                'components/ (root) must stay atomic: if it needs routes/features/layouts, it belongs in features/.',
                        },
                    ],
                },
            ],
        },
    },
);
