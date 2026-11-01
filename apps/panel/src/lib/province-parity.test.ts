/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HEALTH_PROFESSIONS } from './health-professions';
import { parsePhpStringEnumCases } from './parse-php-enum';
import { PROVINCES } from './provinces';

const ENUMS_PATH = path.resolve(__dirname, '../../../api/app/Enums');

// Each enum's labels, in its `label()` match: `self::Case => 'Label',`.
function phpLabels(source: string): string[] {
    return [...source.matchAll(/self::\w+\s*=>\s*'([^']*)',/g)].map(
        (match) => match[1],
    );
}

// Like the ErrorCode parity: apps/api only resolves in CI/host, where a
// missing file fails loudly instead of being skipped.
describe.each([
    ['Province.php', PROVINCES],
    ['HealthProfession.php', HEALTH_PROFESSIONS],
] as const)('panel/backend %s parity', (file, options) => {
    it('lists the same values and labels as the API enum', () => {
        const enumPath = path.join(ENUMS_PATH, file);

        if (!existsSync(enumPath)) {
            if (process.env.CI === 'true') {
                throw new Error(
                    `Expected to find the backend enum at ${enumPath} under CI, but it was unreachable.`,
                );
            }

            return;
        }

        const source = readFileSync(enumPath, 'utf-8');
        const values = parsePhpStringEnumCases(source);
        const labels = phpLabels(source).slice(0, values.length);

        expect(values.length).toBeGreaterThan(0);
        expect(new Set(options.map((option) => option.value))).toEqual(
            new Set(values),
        );
        expect(new Set(options.map((option) => option.label))).toEqual(
            new Set(labels),
        );
    });
});
