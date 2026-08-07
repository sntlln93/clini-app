import js from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['apps/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    prettierRecommended,
    {
        files: ['e2e/**/*.ts', 'playwright.config.ts'],
        languageOptions: {
            globals: globals.node,
        },
    },
);
