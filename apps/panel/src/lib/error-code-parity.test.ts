/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ERROR_CODE_MESSAGES } from './error-codes';
import { parsePhpStringEnumCases } from './parse-php-enum';

// Only reachable when the whole monorepo is checked out next to this file
// (real CI, or a host-side run) — the `panel` dev container mounts only
// `apps/panel` (see #113), so `apps/api` doesn't exist inside it. That's a
// dev-container limitation, not a reason to skip where it actually matters:
// `tests_frontend` runs natively on the CI runner with a full checkout, so
// this fails loudly there instead of silently passing.
const PHP_ENUM_PATH = path.resolve(
    __dirname,
    '../../../api/app/Enums/ErrorCode.php',
);

describe('panel/backend ErrorCode parity', () => {
    it('matches apps/api/app/Enums/ErrorCode.php exactly', () => {
        if (!existsSync(PHP_ENUM_PATH)) {
            if (process.env.CI === 'true') {
                throw new Error(
                    `Expected to find the backend enum at ${PHP_ENUM_PATH} under CI, but it was unreachable. ` +
                        'A skip here would silently hide a real divergence between the panel and the API.',
                );
            }

            // Not CI: most likely the `panel` dev container, which mounts
            // only apps/panel — see apps/panel/compose.yaml and issue #113.
            return;
        }

        const phpSource = readFileSync(PHP_ENUM_PATH, 'utf-8');
        const backendCodes = parsePhpStringEnumCases(phpSource);

        // Guards against a regex that silently stopped matching anything —
        // without this, an empty `backendCodes` would make the assertion
        // below pass vacuously.
        expect(backendCodes.length).toBeGreaterThan(0);

        const panelCodes = Object.keys(ERROR_CODE_MESSAGES);

        expect(new Set(panelCodes)).toEqual(new Set(backendCodes));
    });
});
