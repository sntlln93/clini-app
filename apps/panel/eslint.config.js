import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
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

// Shared between the main `no-restricted-syntax` block and the exemption
// block below for the three files allowed to call router.invalidate()
// directly — flat config replaces a rule's whole options array per matching
// file instead of merging, so the exemption block must repeat these or it
// would silently drop them for those files (see AXIOS_IMPORT_RESTRICTION
// above for the same pattern).
const SSR_DIRECTIVE_RESTRICTIONS = [
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
];

// Calling router.invalidate() directly doesn't refresh a read that lives
// only in a route loader (queryClient.ensureQueryData returns the cached
// value without checking invalidation) — see issue #169. Use
// useRefreshPageData() instead.
const ROUTER_INVALIDATE_RESTRICTION = {
    selector:
        "CallExpression[callee.type='MemberExpression'][callee.property.name='invalidate']",
    message:
        'Do not call router.invalidate() directly: it does not refresh a read that lives only in a route loader (ensureQueryData returns the cached value). Use useRefreshPageData() from @/hooks/use-refresh-page-data in the mutation onSuccess instead — see ADR 0007.',
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
    // `strict` (not `recommended`) so every enabled rule is `error`, never
    // `warn` — the plugin's own `strict` preset already keeps
    // `control-has-associated-label` and `label-has-for` off (superseded by
    // `label-has-associated-control`) and doesn't turn on
    // `anchor-ambiguous-text`, matching this project's decision to leave
    // `control-has-associated-label` off unless a concrete case justifies it.
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
            // jsx-a11y's static checks only understand native HTML tags, so
            // without this mapping it can't see through this project's own
            // wrapper components at all (e.g. `<Button>` looks like an
            // unknown custom element, not a `<button>`). Values are each
            // wrapper's actual rendered tag (verified in the component's own
            // source under src/components/ui/), not a guess.
            'jsx-a11y': {
                components: {
                    Button: 'button',
                    DropdownMenuTrigger: 'button',
                    SidebarMenuButton: 'button',
                    Badge: 'span',
                    Input: 'input',
                    Label: 'label',
                    // Checkbox/Switch are base-ui `useButton` consumers
                    // (@base-ui/react/checkbox/root/CheckboxRoot.js,
                    // switch/root/SwitchRoot.js): they render a native
                    // <button> with role="checkbox"/"switch" overridden on
                    // top, not an <input>.
                    Checkbox: 'button',
                    Switch: 'button',
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
    // The panel is a client-rendered SPA with no SSR/RSC (see ADR 0001), so
    // Next.js-style `'use client'`/`'use server'` directives are meaningless
    // here — ban both, with no exempt folders. Also bans calling
    // router.invalidate() directly: paired with invalidateQueries it doesn't
    // refresh a loader-only read, see issue #169.
    {
        files: ['src/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...SSR_DIRECTIVE_RESTRICTIONS,
                ROUTER_INVALIDATE_RESTRICTION,
            ],
        },
    },
    // The shared helper, the hook that wraps it, and RouteErrorState's retry
    // are the only places allowed to call router.invalidate() (see issue
    // #202). The SSR-directive restrictions are repeated here because flat
    // config replaces a rule's entire options array per matching file
    // instead of merging.
    {
        files: [
            'src/lib/page-data.ts',
            'src/hooks/use-refresh-page-data.ts',
            'src/components/RouteErrorState.tsx',
        ],
        rules: {
            'no-restricted-syntax': ['error', ...SSR_DIRECTIVE_RESTRICTIONS],
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
