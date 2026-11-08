/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { foldText, matchRanges } from './text-match';

const slices = (text: string, query: string) =>
    matchRanges(text, query).map(([start, end]) => text.slice(start, end));

describe('foldText', () => {
    it('folds like the API: lowercase, no accents, ñ as n, collapsed spaces', () => {
        expect(foldText('  Cardiología   INFANTIL ')).toBe(
            'cardiologia infantil',
        );
        expect(foldText('Acompañante terapéutico, Güemes')).toBe(
            'acompanante terapeutico, guemes',
        );
    });

    // The dashboard container mounts only apps/dashboard, so apps/api only
    // resolves in CI/host, where a missing file fails instead of skipping.
    it('drops the same characters as App\\Support\\FoldedText', () => {
        const file = path.resolve(
            __dirname,
            '../../../api/app/Support/FoldedText.php',
        );
        if (!existsSync(file)) {
            if (process.env.CI === 'true') {
                throw new Error(`Expected ${file} under CI.`);
            }

            return;
        }
        const pairs = [
            ...readFileSync(file, 'utf-8').matchAll(/'(\S)' => '(\S)'/g),
        ];

        expect(pairs.length).toBeGreaterThan(0);
        for (const [, from, to] of pairs) {
            expect(foldText(from)).toBe(to);
        }
    });
});

describe('matchRanges', () => {
    it('finds the original text, whatever its case or accents', () => {
        expect(slices('Cardiología', 'CARDIOLOGIA')).toEqual(['Cardiología']);
        expect(slices('Cardiología', 'logía')).toEqual(['logía']);
        expect(slices('Acompañante terapéutico', 'ANTE TERA')).toEqual([
            'ante tera',
        ]);
    });

    it('marks every occurrence, left to right, without overlapping', () => {
        expect(matchRanges('Ana y ana', 'ana')).toEqual([
            [0, 3],
            [6, 9],
        ]);
        expect(matchRanges('aaaa', 'aa')).toEqual([
            [0, 2],
            [2, 4],
        ]);
    });

    it('spans a run of spaces the folding collapses', () => {
        expect(slices('Cirugía   general', 'cirugia general')).toEqual([
            'Cirugía   general',
        ]);
    });

    it('marks nothing for an empty search or no match', () => {
        expect(matchRanges('Pediatría', '   ')).toEqual([]);
        expect(matchRanges('Pediatría', 'cardio')).toEqual([]);
    });
});
