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
            'Anulada el 08/09/2026 09:00 por Dra. Exportadora. Ya no es necesaria. Motivo: Terminó el tratamiento.',
        );
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
