/// <reference types="node" />
import { setPracticeTimeZone } from '@/lib/datetime';
import { loadPdfMake } from '@/lib/pdf/pdfmake';
import { buildClinicalRecord } from '@/tests/fixtures/clinical-record';
import { brand } from '@clini/brand';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ClinicalRecordLetterhead } from './branding';
import { buildClinicalRecordDocument } from './document';

/** A PDF's bytes as Latin-1 text: its dictionaries are plain ASCII. */
function textOf(buffer: Uint8Array): string {
    return Array.from(buffer, (byte) => String.fromCharCode(byte)).join('');
}

/** One of the manifest's files, as the panel serves it. */
function brandFile(file: string): string {
    const root = dirname(
        createRequire(import.meta.url).resolve('@clini/brand'),
    );

    return readFileSync(join(root, 'assets', file), 'utf-8');
}

/** A history long enough to span pages: the trail repeated. */
function longRecord() {
    const record = buildClinicalRecord();
    const [entry] = record.access_log;
    record.access_log = Array.from({ length: 120 }, (_, index) => ({
        ...entry,
        id: index + 1,
    }));

    return record;
}

// pdfmake itself, not a mock: the definition has to lay out for real,
// cards breaking across pages included.
describe('the clinical record drawn by pdfmake', () => {
    beforeEach(() => setPracticeTimeZone('America/Argentina/Buenos_Aires'));
    afterEach(() => setPracticeTimeZone(null));

    it.each<[string, ClinicalRecordLetterhead]>([
        [
            'with the manifest’s logotype and isotype',
            {
                brandName: brand.name,
                logoSvg: brandFile(brand.assets.logotype.light),
                isotypeSvg: brandFile(brand.assets.isotype.light),
            },
        ],
        [
            'naming the brand without them',
            { brandName: brand.name, logoSvg: null, isotypeSvg: null },
        ],
    ])(
        'lays a long history out over several A4 pages, in Outfit, %s',
        async (_, letterhead) => {
            const pdfMake = await loadPdfMake();
            const pdf = textOf(
                await pdfMake
                    .createPdf(
                        buildClinicalRecordDocument(longRecord(), letterhead),
                    )
                    .getBuffer(),
            );
            const pages = Number(
                /\/Type \/Pages\s*\/Count (\d+)/.exec(pdf)?.[1],
            );

            expect(pages).toBeGreaterThan(1);
            expect(pdf).toMatch(/\/MediaBox \[0 0 595\.28 841\.89\]/);
            expect(pdf).toMatch(/\/BaseFont \/[A-Z]{6}\+Outfit-Regular/);
            expect(pdf).toMatch(/\/BaseFont \/[A-Z]{6}\+Outfit-Medium/);
            expect(pdf).not.toContain('Roboto');
        },
        30_000,
    );
});
