import { setPracticeTimeZone } from '@/lib/datetime';
import { buildClinicalRecord } from '@/tests/fixtures/clinical-record';
import type {
    Content,
    ContextPageSize,
    DynamicContent,
    Node,
    NodeQueries,
} from 'pdfmake/interfaces';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    buildClinicalRecordDocument,
    keepTitlesWithContent,
    type Letterhead,
} from './document';

const LOGO = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
const PAGE: ContextPageSize = {
    width: 595.28,
    height: 841.89,
    orientation: 'portrait',
};

/** Every string a piece of pdfmake content prints, in order. */
function textOf(content: unknown): string {
    if (typeof content === 'string' || typeof content === 'number') {
        return String(content);
    }

    if (Array.isArray(content)) {
        return content.map(textOf).join('\n');
    }

    if (content && typeof content === 'object') {
        const node = content as Record<string, unknown>;
        const table = node.table as { body?: unknown } | undefined;

        return [node.text, node.stack, node.columns, node.ul, table?.body]
            .filter((part) => part !== undefined)
            .map(textOf)
            .join('\n');
    }

    return '';
}

function render(
    letterhead: Letterhead = { brandName: 'Clini', logoSvg: LOGO },
) {
    return buildClinicalRecordDocument(buildClinicalRecord(), letterhead);
}

function atPage(dynamic: unknown, page: number, pages: number): Content {
    return (dynamic as DynamicContent)(page, pages, PAGE) as Content;
}

describe('buildClinicalRecordDocument', () => {
    beforeEach(() => setPracticeTimeZone('America/Argentina/Buenos_Aires'));
    afterEach(() => setPracticeTimeZone(null));

    // dompdf's PDF said «Página 1 de 0»: a CSS counter can't count the pages.
    it('numbers every page out of the real total', () => {
        const footer = textOf(atPage(render().footer, 2, 3));

        expect(footer).toContain('Página 2 de 3');
        expect(footer).toContain(
            'Historia clínica de Paciente Compartido · Consultorio Norte',
        );
    });

    it('opens every page with the brand letterhead and the practice', () => {
        const header = atPage(render().header, 1, 3);

        expect(JSON.stringify(header)).toContain(JSON.stringify(LOGO));
        expect(textOf(header)).toContain('Consultorio Norte');
    });

    it('names the brand when its logotype could not be read', () => {
        const header = atPage(
            render({ brandName: 'Clini', logoSvg: null }).header,
            1,
            1,
        );

        expect(JSON.stringify(header)).not.toContain('"svg"');
        expect(textOf(header)).toContain('Clini');
    });

    it('holds every act with its author, time and reason, in the practice zone', () => {
        const text = textOf(render().content);

        expect(text).toContain(
            'Generada el 20/10/2026 10:30 por Dra. Exportadora. Este documento no es una receta.',
        );
        expect(text).toContain('DNI 30111222');
        expect(text).toContain('14/03/1990');
        // 13:00 UTC is 10:00 in Buenos Aires.
        expect(text).toContain(
            '01/09/2026 10:00 · Dra. Exportadora · Consulta',
        );
        expect(text).toContain('Completado · Motivo: Control');
        expect(text).toContain('Versión 1, Dra. Exportadora, 01/09/2026 10:20');
        expect(text).toContain(
            'Enmienda (versión 2), Dra. Exportadora, 02/09/2026 09:00 · Motivo: Faltaba un dato.',
        );
        expect(text).toContain('Nota enmendada.');
        expect(text).toContain(
            'J06.9 · Infección aguda de las vías respiratorias superiores',
        );
        expect(text).toContain(
            'Anulada el 11/09/2026 07:00 por Dr. Colega. Motivo: Paciente equivocado.',
        );
        expect(text).toContain(
            'Ibuprofeno, Comprimidos 400 mg · 1 cada 8 h · Cantidad: 2',
        );
        expect(text).toContain(
            'Anulada el 08/09/2026 09:00 por Dra. Exportadora. Motivo: Terminó el tratamiento.',
        );
        // Every author's medication, as the notes (#359).
        expect(text).toContain('Paracetamol · Si hay fiebre · Cantidad: 1');
        expect(text).toContain('Versión 1, Dr. Colega, 10/09/2026 12:20');
    });

    it('holds every measurement with its versions and the background of every author (#361)', () => {
        const text = textOf(render().content);

        expect(text).toContain(
            'Medición\n · tomada por Dra. Exportadora el 01/09/2026 10:10',
        );
        expect(text).toContain(
            'Peso: 80 kg · Altura: 180 cm · IMC: 24,7 kg/m²',
        );
        expect(text).toContain(
            'Enmienda (versión 2), Dra. Exportadora, 01/09/2026 10:20 · Motivo: Balanza mal calibrada.',
        );
        expect(text).toContain('Peso: 78,5 kg');
        expect(text).toContain('O+ · Dr. Colega, 10/09/2026 12:25');
        expect(text).toContain('Penicilina · Urticaria · Severidad grave');
        expect(text).toContain(
            'Ya no vigente desde el 10/09/2026 12:40, según Dr. Colega. Motivo: Ya no la tiene.',
        );
        // The background is of the person: it comes before the appointments.
        expect(text.indexOf('Antecedentes')).toBeLessThan(
            text.indexOf('Turnos y actuaciones'),
        );
    });

    it('says the blood type is not recorded when there is none', () => {
        const text = textOf(
            buildClinicalRecordDocument(
                buildClinicalRecord({ blood_types: [], medical_history: [] }),
                { brandName: 'Clini', logoSvg: LOGO },
            ).content,
        );

        expect(text).toContain('Grupo sanguíneo: sin registrar.');
        expect(text).not.toContain('Alergias');
    });

    it('says which medication was indicated despite an allergy warning, and the trail its confirmation (#362)', () => {
        const record = buildClinicalRecord();
        const [warned] = record.appointments.flatMap(
            (appointment) => appointment.prescriptions,
        );
        warned.versions[0].allergy_warning_overridden = true;
        record.access_log = [
            {
                ...record.access_log[0],
                id: 999,
                action: 'allergy_warning_overridden',
                reason: null,
                export: null,
            },
        ];

        const text = textOf(
            buildClinicalRecordDocument(record, {
                brandName: 'Clini',
                logoSvg: LOGO,
            }).content,
        );

        expect(text).toContain('Indicada pese a un aviso de alergia.');
        expect(text).toContain('Indicó medicación pese a un aviso de alergia');
    });

    it('closes with the access trail, as the patient page words it', () => {
        const text = textOf(render().content);

        expect(text.indexOf('Registro de accesos')).toBeGreaterThan(
            text.indexOf('Nota del colega.'),
        );
        expect(text).toContain(
            'Acceso excepcional · Motivo: Preparar la consulta',
        );
        expect(text).toContain('Exportó la historia clínica · PDF');
    });

    it('says so when there are no appointments nor accesses', () => {
        const text = textOf(
            buildClinicalRecordDocument(
                buildClinicalRecord({ appointments: [], access_log: [] }),
                { brandName: 'Clini', logoSvg: LOGO },
            ).content,
        );

        expect(text).toContain(
            'No hay turnos con este paciente en el consultorio.',
        );
        expect(text).toContain('No hay accesos registrados.');
    });
});

describe('keepTitlesWithContent', () => {
    const node = (headlineLevel?: number, stack = false): Node => ({
        headlineLevel,
        pageNumbers: [1],
        pages: 1,
        stack,
        startPosition: {
            pageNumber: 1,
            pageOrientation: 'portrait',
            pageInnerHeight: 700,
            pageInnerWidth: 490,
            left: 51,
            top: 80,
            verticalRatio: 0,
            horizontalRatio: 0,
        },
    });
    const queries = (following: Node[]): NodeQueries => ({
        getFollowingNodesOnPage: () => following,
        getNodesOnNextPage: () => [],
        getPreviousNodesOnPage: () => [],
    });

    it('moves a title that would end the page alone', () => {
        expect(keepTitlesWithContent(node(1), queries([]))).toBe(true);
    });

    it('leaves a title with content after it, and any other node', () => {
        expect(keepTitlesWithContent(node(1), queries([node()]))).toBe(false);
        expect(keepTitlesWithContent(node(), queries([]))).toBe(false);
    });

    // A section title and its first appointment's title end the page: the
    // section title moves too, since pdfmake won't look at it again.
    it('moves a title followed on the page only by other titles', () => {
        expect(
            keepTitlesWithContent(
                node(1),
                queries([node(undefined, true), node(2)]),
            ),
        ).toBe(true);
    });
});
