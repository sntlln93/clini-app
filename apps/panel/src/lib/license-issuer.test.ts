import { describe, expect, it } from 'vitest';
import { formatLicenseIssuer } from './license-issuer';

describe('formatLicenseIssuer', () => {
    it.each([
        ['KINESIÓLOGOS, Colegio de', 'Colegio de Kinesiólogos'],
        ['MEDICOS DISTRITO I, Colegio de', 'Colegio de Medicos Distrito I'],
        [
            'PSICOLOGOS DISTRITO XIII, Colegio de',
            'Colegio de Psicologos Distrito XIII',
        ],
        [
            'PROFESIONALES DE ENFERMERIA , COLEGIO DE',
            'Colegio de Profesionales de Enfermeria',
        ],
        [
            'MEDICOS - SEGUNDA CIRCUNSCRIPCION, Colegio de',
            'Colegio de Medicos - Segunda Circunscripcion',
        ],
        [
            'MINISTERIO DE SALUD DE LA NACION',
            'Ministerio de Salud de la Nacion',
        ],
        ['COLEGIO DE ENFERMEROS', 'Colegio de Enfermeros'],
    ])('reads «%s» as «%s»', (issuer, readable) => {
        expect(formatLicenseIssuer(issuer)).toBe(readable);
    });
});
