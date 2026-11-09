import { setPracticeTimeZone } from '@/lib/datetime';
import { PDF_COLORS, PDF_FONT } from '@/lib/pdf/theme';
import { buildClinicalRecord } from '@/tests/fixtures/clinical-record';
import type {
    Content,
    ContextPageSize,
    DynamicContent,
    Node,
    NodeQueries,
} from 'pdfmake/interfaces';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { statusChip } from './appointments';
import type { ClinicalRecordLetterhead } from './branding';
import { buildClinicalRecordDocument, keepTitlesWithContent } from './document';
import { PAGE_CHROME } from './nodes';

const LOGO = '<svg xmlns="http://www.w3.org/2000/svg" id="logo"></svg>';
const ISOTYPE = '<svg xmlns="http://www.w3.org/2000/svg" id="isotype"></svg>';
const LETTERHEAD: ClinicalRecordLetterhead = {
    brandName: 'Clini',
    logoSvg: LOGO,
    isotypeSvg: ISOTYPE,
};
const PAGE: ContextPageSize = {
    width: 595.28,
    height: 841.89,
    orientation: 'portrait',
};

/**
 * Every string a piece of pdfmake content prints, in order: a block per
 * line, and the runs of one text inline, as pdfmake sets them.
 */
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

        if (Array.isArray(node.text)) {
            return node.text.map(textOf).join('');
        }

        return [node.text, node.stack, node.columns, node.ul, table?.body]
            .filter((part) => part !== undefined)
            .map(textOf)
            .join('\n');
    }

    return '';
}

/** Every node of a piece of content that prints a text of its own. */
function textNodes(content: unknown): Record<string, unknown>[] {
    if (Array.isArray(content)) {
        return content.flatMap(textNodes);
    }

    if (!content || typeof content !== 'object') {
        return [];
    }

    const node = content as Record<string, unknown>;
    const table = node.table as { body?: unknown } | undefined;

    return [
        ...(node.text !== undefined && !Array.isArray(node.text) ? [node] : []),
        ...[node.text, node.stack, node.columns, table?.body].flatMap((part) =>
            Array.isArray(part) ? textNodes(part) : [],
        ),
    ];
}

function render(letterhead: ClinicalRecordLetterhead = LETTERHEAD) {
    return buildClinicalRecordDocument(buildClinicalRecord(), letterhead);
}

function atPage(dynamic: unknown, page: number, pages: number): Content {
    return (dynamic as DynamicContent)(page, pages, PAGE) as Content;
}

describe('buildClinicalRecordDocument', () => {
    beforeEach(() => setPracticeTimeZone('America/Argentina/Buenos_Aires'));
    afterEach(() => setPracticeTimeZone(null));

    // dompdf's PDF said «Página 1 de 0»: a CSS counter can't count the pages.
    it('numbers every page out of the real total, beside the brand', () => {
        const footer = atPage(render().footer, 2, 3);

        expect(textOf(footer)).toContain('Generada con Clini · Página 2 de 3');
        expect(textOf(footer)).toContain(
            'Historia clínica de Paciente Compartido · Consultorio Norte',
        );
        expect(JSON.stringify(footer)).toContain(JSON.stringify(ISOTYPE));
    });

    it('names the brand in the footer when its isotype could not be read', () => {
        const footer = atPage(
            render({ ...LETTERHEAD, isotypeSvg: null }).footer,
            1,
            1,
        );

        expect(JSON.stringify(footer)).not.toContain('"svg"');
        expect(textOf(footer)).toContain('Generada con Clini · Página 1 de 1');
    });

    // #432: the practice names every page; Clini's brand accompanies it.
    it('opens every page with the brand, the practice and whose history it is, over a rule in the brand teal', () => {
        const header = atPage(render().header, 1, 3);

        expect(JSON.stringify(header)).toContain(JSON.stringify(LOGO));
        expect(textOf(header)).toContain('Consultorio Norte');
        expect(textOf(header)).toContain(
            'Historia clínica · Paciente Compartido',
        );
        expect(JSON.stringify(header)).toContain(
            `"lineColor":"${PDF_COLORS.primary}"`,
        );
    });

    it('names the brand when its logotype could not be read', () => {
        const header = atPage(
            render({ ...LETTERHEAD, logoSvg: null }).header,
            1,
            1,
        );

        expect(JSON.stringify(header)).not.toContain('"svg"');
        expect(textOf(header)).toContain('Clini');
        expect(textOf(header)).toContain('Consultorio Norte');
    });

    it('is set in the theme’s typeface and colors, and says the brand made it', () => {
        const document = render();

        expect(document.defaultStyle?.font).toBe(PDF_FONT);
        expect(document.defaultStyle?.color).toBe(PDF_COLORS.text);
        expect(document.styles?.section?.color).toBe(PDF_COLORS.primary);
        expect(document.info).toMatchObject({
            creator: 'Clini',
            producer: 'Clini',
        });
    });

    it('opens with the practice, the title, the patient and the notice, its closing sentence in bold', () => {
        const [practice, title, patient, notice] = render()
            .content as Content[];

        expect(textOf(practice)).toBe('Consultorio Norte');
        expect(textOf(title)).toBe('Historia clínica');
        expect(textOf(patient)).toBe('Paciente Compartido · DNI 30111222');
        expect(textOf(notice)).toBe(
            'Generada el 20/10/2026 10:30 por Dra. Exportadora. Este documento no es una receta.',
        );
        expect(JSON.stringify(notice)).toContain(
            '{"text":"Este documento no es una receta.","bold":true}',
        );
    });

    it('holds every act with its author, time and reason, in the practice zone', () => {
        const text = textOf(render().content);

        expect(text).toContain('DNI 30111222');
        expect(text).toContain('14/03/1990');
        // 13:00 UTC is 10:00 in Buenos Aires.
        expect(text).toContain(
            '01/09/2026 10:00 · Dra. Exportadora · Consulta',
        );
        expect(text).toContain('Motivo: Control');
        expect(text).toContain('Completado');
        expect(text).toContain('Versión 1, Dra. Exportadora, 01/09/2026 10:20');
        expect(text).toContain(
            'Enmienda · versión 2\nDra. Exportadora, 02/09/2026 09:00 · Motivo: Faltaba un dato.',
        );
        expect(text).toContain('Nota enmendada.');
        expect(text).toContain(
            'J06.9 · Infección aguda de las vías respiratorias superiores',
        );
        expect(text).toContain(
            'Anulada el 11/09/2026 07:00 por Dr. Colega. Motivo: Paciente equivocado.',
        );
        expect(text).toContain(
            'Ibuprofeno, Comprimidos 400 mg\n1 cada 8 h · Cantidad: 2',
        );
        expect(text).toContain(
            'Anulada el 08/09/2026 09:00 por Dra. Exportadora. Motivo: Terminó el tratamiento.',
        );
        // Every author's medication, as the notes (#359).
        expect(text).toContain('Paracetamol\nSi hay fiebre · Cantidad: 1');
        expect(text).toContain('Versión 1, Dr. Colega, 10/09/2026 12:20');
    });

    it('holds every measurement with its versions and the background of every author (#361)', () => {
        const text = textOf(render().content);

        expect(text).toContain(
            'Medición · tomada por Dra. Exportadora el 01/09/2026 10:10',
        );
        expect(text).toContain(
            'Peso\n80 kg\n\nAltura\n180 cm\n\nIMC\n24,7 kg/m²',
        );
        expect(text).toContain(
            'Dra. Exportadora, 01/09/2026 10:20 · Motivo: Balanza mal calibrada.',
        );
        expect(text).toContain('Peso\n78,5 kg');
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
                LETTERHEAD,
            ).content,
        );

        expect(text).toContain('Grupo sanguíneo\nSin registrar.');
        expect(text).not.toContain('Alergias');
    });

    // #432: the panel's status map, cancelled and rescheduled struck through.
    it('marks each appointment with its status, as the panel colors it', () => {
        const record = buildClinicalRecord();
        const [appointment] = record.appointments;
        const cancelled = {
            ...appointment,
            id: 77,
            status: 'cancelled' as const,
            cancelled_at: '2026-09-03T12:00:00Z',
            cancellation_reason: 'Viaje',
            clinical_notes: [],
            prescriptions: [],
            vital_signs: [],
        };
        const text = textOf(
            buildClinicalRecordDocument(
                { ...record, appointments: [cancelled, appointment] },
                LETTERHEAD,
            ).content,
        );

        expect(text).toContain(
            'Motivo: Control · Cancelado el 03/09/2026 09:00 (Viaje)',
        );
        expect(statusChip('no_show')).toMatchObject({
            table: {
                body: [[{ text: 'Ausente', color: PDF_COLORS.statusNoShow }]],
            },
        });
        expect(statusChip('cancelled')).toMatchObject({
            table: {
                body: [
                    [
                        {
                            text: 'Cancelado',
                            color: PDF_COLORS.statusScheduled,
                            decoration: 'lineThrough',
                        },
                    ],
                ],
            },
        });
        expect(JSON.stringify(statusChip('completed'))).not.toContain(
            'lineThrough',
        );
    });

    // #432: a title never ends a page alone, whatever the page holds.
    it('keeps each title with what it titles, never with the page’s header and footer', () => {
        const record = buildClinicalRecord();
        const [withRecords] = record.appointments;
        const plain = {
            ...withRecords,
            id: 50,
            clinical_notes: [],
            prescriptions: [],
            vital_signs: [],
        };
        const document = buildClinicalRecordDocument(
            {
                ...record,
                appointments: [plain, withRecords],
                outside_appointments: {
                    clinical_notes: withRecords.clinical_notes,
                    prescriptions: [],
                    vital_signs: [],
                },
            },
            LETTERHEAD,
        );
        const json = (content: unknown) => JSON.stringify(content);
        const content = (document.content as Content[]).flat();
        const subtitles = content.filter(
            (node) =>
                typeof node === 'object' &&
                'style' in node &&
                node.style === 'meta',
        );

        // The sections' subtitles move with their titles.
        expect(subtitles).toHaveLength(2);
        expect(subtitles).toEqual(
            subtitles.map(() => expect.objectContaining({ headlineLevel: 1 })),
        );
        // An appointment with records keeps its heading with them; one
        // without is a plain row, never pushed ahead of the next.
        const cards = content.filter((node) =>
            json(node).includes('Motivo: Control'),
        );
        const [rows, card] = cards as unknown as Record<string, unknown>[];
        expect(json(rows)).not.toContain('headlineLevel');
        const [{ stack: inCard }] = (
            card.table as { body: { stack: { stack: Content[] }[] }[][] }
        ).body[0][0].stack;
        const [heading] = inCard;
        expect(textNodes(heading).length).toBeGreaterThan(0);
        expect(textNodes(heading)).toEqual(
            textNodes(heading).map(() =>
                expect.objectContaining({ headlineLevel: 2 }),
            ),
        );
        // The header's and footer's nodes are marked as the page's own.
        for (const chrome of [
            atPage(document.header, 1, 2),
            atPage(document.footer, 1, 2),
        ]) {
            expect(textNodes(chrome)).toEqual(
                textNodes(chrome).map(() =>
                    expect.objectContaining({ style: PAGE_CHROME }),
                ),
            );
        }
    });

    it('never leaves the trail’s heading row alone at a page’s foot', () => {
        const trail = (render().content as Content[]).at(-1);

        expect(trail).toMatchObject({
            table: { headerRows: 1, keepWithHeaderRows: 1 },
        });
    });

    // Outfit's Latin cut has no «≥» nor Greek: they would print as nothing.
    it('sets in pdfmake’s own typeface the free text Outfit can’t draw', () => {
        const record = buildClinicalRecord();
        const [note] = record.appointments[0].clinical_notes;
        note.versions[0].body = 'PA ≥ 140, iniciar β-bloqueante.';
        record.patient.name = 'Zoë Παπαδοπούλου';
        const document = buildClinicalRecordDocument(record, LETTERHEAD);
        const json = JSON.stringify(document.content);

        expect(json).toContain(
            '"text":"PA ≥ 140, iniciar β-bloqueante.","preserveLeadingSpaces":true,"font":"Roboto"',
        );
        expect(json).toContain(
            '{"text":"Zoë Παπαδοπούλου","margin":[0,2,0,0],"font":"Roboto"}',
        );
        expect(JSON.stringify(atPage(document.header, 1, 1))).toContain(
            '"text":"Historia clínica · Zoë Παπαδοπούλου","fontSize":9,"color":"#5a6b6c","style":"pageChrome","font":"Roboto"',
        );
        expect(json).not.toContain(
            '"text":"Nota enmendada.","preserveLeadingSpaces":true,"font"',
        );
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
            buildClinicalRecordDocument(record, LETTERHEAD).content,
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

    // #382: what was recorded outside an appointment, in a group of its own.
    it('groups the records made outside an appointment apart, and marks the background', () => {
        const record = buildClinicalRecord();
        const [appointment] = record.appointments;
        const text = textOf(
            buildClinicalRecordDocument(
                {
                    ...record,
                    appointments: [],
                    outside_appointments: {
                        clinical_notes: appointment.clinical_notes,
                        prescriptions: appointment.prescriptions,
                        vital_signs: appointment.vital_signs,
                    },
                    blood_types: record.blood_types.map((bloodType) => ({
                        ...bloodType,
                        appointment_id: null,
                    })),
                },
                LETTERHEAD,
            ).content,
        );
        const outside = text.slice(text.indexOf('Fuera de un turno\n'));

        expect(outside).toContain(
            'Registrado desde la ficha del paciente, sin un turno.',
        );
        expect(outside).toContain('Nota enmendada.');
        expect(text).toMatch(/O\+ · .+ · Fuera de un turno/);
    });

    it('leaves the group out when nothing was recorded outside an appointment', () => {
        expect(textOf(render().content)).not.toContain('Fuera de un turno');
    });

    it('says so when there are no appointments nor accesses', () => {
        const text = textOf(
            buildClinicalRecordDocument(
                buildClinicalRecord({ appointments: [], access_log: [] }),
                LETTERHEAD,
            ).content,
        );

        expect(text).toContain(
            'No hay turnos con este paciente en el consultorio.',
        );
        expect(text).toContain('No hay accesos registrados.');
    });
});

describe('keepTitlesWithContent', () => {
    const node = (
        headlineLevel?: number,
        stack = false,
        style?: string,
    ): Node => ({
        headlineLevel,
        style,
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

    // pdfmake lists the header's and footer's nodes among the following
    // ones on every page: counted as content, no title would ever move.
    it('moves a title followed on the page only by the header and footer', () => {
        expect(
            keepTitlesWithContent(
                node(1),
                queries([node(undefined, false, PAGE_CHROME)]),
            ),
        ).toBe(true);
    });
});
