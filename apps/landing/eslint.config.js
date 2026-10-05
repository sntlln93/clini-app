import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tailwindCanonical from 'eslint-plugin-tailwind-canonical-classes';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import requireNativeButton from './eslint-rules/require-native-button.js';

// Same rule set as apps/panel and apps/dashboard, minus what only applies to
// an API client (the axios and router.invalidate() restrictions): the
// landing never calls the API.
export default tseslint.config(
    {
        ignores: [
            'node_modules/',
            '.output/',
            '.nitro/',
            'src/routeTree.gen.ts',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    react.configs.flat.recommended,
    reactHooks.configs.flat.recommended,
    jsxA11y.flatConfigs.strict,
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
            'jsx-a11y': {
                components: {
                    Button: 'button',
                },
            },
        },
        rules: {
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
            'no-console': 'error',
        },
    },
    // Server-rendered with TanStack Start, which has no RSC: React's
    // 'use client'/'use server' directives mean nothing here either.
    {
        files: ['src/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: "ExpressionStatement[directive='use client']",
                    message:
                        "'use client' is meaningless: TanStack Start has no React Server Components.",
                },
                {
                    selector: "ExpressionStatement[directive='use server']",
                    message:
                        "'use server' is meaningless: TanStack Start uses createServerFn, not directives.",
                },
            ],
        },
    },
    // See apps/panel: a Base UI button composed with a non-native element
    // via `render` needs an explicit `nativeButton`.
    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: {
            local: { rules: { 'require-native-button': requireNativeButton } },
        },
        rules: { 'local/require-native-button': 'error' },
    },
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
    {
        files: ['src/components/**'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@/routes/*', '@/routes/**'],
                            message:
                                'components/ must stay domain-agnostic: no routes imports.',
                        },
                    ],
                },
            ],
        },
    },
);
