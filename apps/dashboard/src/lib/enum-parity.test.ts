/// <reference types="node" />
import { LICENSE_MISMATCH_REASONS } from '@/types/specialty';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HEALTH_PROFESSIONS } from './health-professions';
import { parsePhpStringEnumCases } from './parse-php-enum';

const ENUMS_PATH = path.resolve(__dirname, '../../../api/app/Enums');

// Each enum's labels, in its `label()` match: `self::Case => 'Label',`.
function phpLabels(source: string): string[] {
    return [...source.matchAll(/self::\w+\s*=>\s*'([^']*)',/g)].map(
        (match) => match[1],
    );
}

// Like the ErrorCode parity: the dashboard container mounts only
// apps/dashboard, so apps/api only resolves in CI/host, where a missing file
// fails loudly instead of being skipped.
function readEnum(file: string): string | null {
    const enumPath = path.join(ENUMS_PATH, file);
    if (existsSync(enumPath)) {
        return readFileSync(enumPath, 'utf-8');
    }
    if (process.env.CI === 'true') {
        throw new Error(
            `Expected to find the backend enum at ${enumPath} under CI, but it was unreachable.`,
        );
    }

    return null;
}

describe('dashboard/backend enum parity', () => {
    it('lists the same professions and labels as HealthProfession.php', () => {
        const source = readEnum('HealthProfession.php');
        if (source === null) {
            return;
        }
        const values = parsePhpStringEnumCases(source);

        expect(values.length).toBeGreaterThan(0);
        expect(HEALTH_PROFESSIONS.map((option) => option.value)).toEqual(
            values,
        );
        expect(HEALTH_PROFESSIONS.map((option) => option.label)).toEqual(
            phpLabels(source).slice(0, values.length),
        );
    });

    it('lists the same reasons as ProfessionalLicenseMismatch.php', () => {
        const source = readEnum('ProfessionalLicenseMismatch.php');
        if (source === null) {
            return;
        }

        expect([...LICENSE_MISMATCH_REASONS]).toEqual(
            parsePhpStringEnumCases(source),
        );
    });
});
