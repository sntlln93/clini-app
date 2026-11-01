import { describe, expect, it } from 'vitest';
import { medicationMarks } from './medication-marks';

// #377: the regulatory marks of a catalog product, in Spanish, control first.
describe('medicationMarks', () => {
    it('labels a psychotropic with an archived prescription', () => {
        expect(
            medicationMarks({
                dispensing_condition: 'Venta Bajo Receta Archivada',
                control_mark: 'PSICOTROPICO IV',
            }),
        ).toEqual([
            { label: 'Psicotrópico IV', tone: 'danger' },
            { label: 'Receta archivada', tone: 'warning' },
        ]);
    });

    it('reads a narcotic as danger and controlled sale as a warning', () => {
        expect(
            medicationMarks({
                dispensing_condition: null,
                control_mark: 'ESTUPEFACIENTE III',
            }),
        ).toEqual([{ label: 'Estupefaciente III', tone: 'danger' }]);
        expect(
            medicationMarks({
                dispensing_condition: null,
                control_mark: 'VENTA VIGILADA',
            }),
        ).toEqual([{ label: 'Venta vigilada', tone: 'warning' }]);
    });

    it('marks over-the-counter and prescription-only sale', () => {
        expect(
            medicationMarks({
                dispensing_condition: 'Venta Libre',
                control_mark: null,
            }),
        ).toEqual([{ label: 'Venta libre', tone: 'neutral' }]);
        expect(
            medicationMarks({
                dispensing_condition: 'Venta Bajo Receta',
                control_mark: null,
            }),
        ).toEqual([{ label: 'Bajo receta', tone: 'info' }]);
    });

    it('gives an unclassified, free-text item no mark', () => {
        expect(
            medicationMarks({
                dispensing_condition: 'No Clasificada',
                control_mark: null,
            }),
        ).toEqual([]);
        expect(
            medicationMarks({ dispensing_condition: null, control_mark: null }),
        ).toEqual([]);
    });
});
