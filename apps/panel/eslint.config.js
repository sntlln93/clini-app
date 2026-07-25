import js from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tailwindCanonical from 'eslint-plugin-tailwind-canonical-classes';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['node_modules/', 'dist/', 'test-results/', 'playwright-report/', 'src/routeTree.gen.ts'],
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
                    message: "'use client' is meaningless: the panel is a client-rendered SPA with no SSR/RSC.",
                },
                {
                    selector: "ExpressionStatement[directive='use server']",
                    message: "'use server' is meaningless: the panel is a client-rendered SPA with no SSR/RSC.",
                },
            ],
        },
    },
    // Structural limits from CLAUDE.md's "Frontend structure": every file
    // stays under 250 lines so heavy logic moves into hooks and
    // sub-components. Vendored shadcn primitives and tests are exempt.
    {
        files: ['src/**/*.{ts,tsx}'],
        ignores: ['src/components/ui/**', 'src/**/*.test.{ts,tsx}', 'src/**/tests/**'],
        rules: {
            'max-lines': ['error', { max: 250, skipBlankLines: false, skipComments: false }],
        },
    },
    // Components stay presentational and under 150 lines; business logic
    // lives in hooks (`.ts`), which the file-length limit above already
    // bounds.
    {
        files: ['src/**/*.tsx'],
        ignores: ['src/components/ui/**', 'src/**/*.test.tsx', 'src/**/tests/**'],
        rules: {
            'max-lines-per-function': ['error', { max: 150, skipBlankLines: true, skipComments: true }],
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
            'tailwind-canonical-classes/tailwind-canonical-classes': ['error', { cssPath: './src/index.css' }],
        },
    },
    // Import boundary: vendored ui/ primitives must stay domain-agnostic —
    // no reaching into routes, features or layouts.
    {
        files: ['src/components/ui/**'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/routes/*', '@/routes/**', '@/features/*', '@/features/**', '@/layouts/*', '@/layouts/**'],
                            message: 'components/ui/ must stay domain-agnostic (no routes/features/layouts imports).',
                        },
                    ],
                },
            ],
        },
    },
    // Import boundary: root components/ are atomic and shared, without
    // domain or layout awareness — composed/domain-aware components belong
    // in features/.
    {
        files: ['src/components/**'],
        ignores: ['src/components/ui/**'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/routes/*', '@/routes/**', '@/features/*', '@/features/**', '@/layouts/*', '@/layouts/**'],
                            message: 'components/ (root) must stay atomic: if it needs routes/features/layouts, it belongs in features/.',
                        },
                    ],
                },
            ],
        },
    },
);
