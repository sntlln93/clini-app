import type { ClinicalRecordDocument } from '@/types/clinical-record';
import type {
    Content,
    Node,
    NodeQueries,
    TDocumentDefinitions,
} from 'pdfmake/interfaces';
import {
    accessLogSection,
    appointmentsSection,
    at,
    nameOf,
    patientSection,
} from './sections';

// The PDF's colors, the theme's (`@clini/theme`) as plain values: a PDF
// can't read CSS variables. Text, muted text, borders and the brand teal.
const TEXT = '#1f2933';
const MUTED = '#52606d';
const BORDER = '#cbd2d9';
const BRAND = '#0d7179';

// 18 mm at the sides, in points.
const SIDE_MARGIN = 51;

export type Letterhead = {
    brandName: string;
    /** The manifest's `logotype.light`, or null when it couldn't be read. */
    logoSvg: string | null;
};

/**
 * The brand's letterhead atop every page, with the practice on the right,
 * and a rule below it.
 */
function header(organization: string, letterhead: Letterhead): Content {
    return {
        margin: [SIDE_MARGIN, 28, SIDE_MARGIN, 0],
        stack: [
            {
                columns: [
                    letterhead.logoSvg
                        ? { svg: letterhead.logoSvg, fit: [80, 24] }
                        : {
                              text: letterhead.brandName,
                              bold: true,
                              fontSize: 14,
                              color: BRAND,
                          },
                    {
                        text: organization,
                        alignment: 'right',
                        style: 'muted',
                        fontSize: 8,
                        margin: [0, 12, 0, 0],
                    },
                ],
            },
            {
                canvas: [
                    {
                        type: 'line',
                        x1: 0,
                        y1: 6,
                        x2: 595.28 - SIDE_MARGIN * 2,
                        y2: 6,
                        lineWidth: 0.75,
                        lineColor: BORDER,
                    },
                ],
            },
        ],
    };
}

/**
 * Moves a section's or an appointment's title to the next page when nothing
 * of what it titles would follow it on this one. Another title, or a stack
 * wrapping it, doesn't count: pdfmake checks each node only once, so a
 * section title followed only by an appointment title that moves would
 * otherwise stay behind alone.
 */
export function keepTitlesWithContent(
    node: Node,
    { getFollowingNodesOnPage }: NodeQueries,
): boolean {
    return (
        node.headlineLevel !== undefined &&
        getFollowingNodesOnPage().every(
            (following) =>
                following.stack || following.headlineLevel !== undefined,
        )
    );
}

/**
 * One patient's clinical history as a pdfmake document, the same shape the
 * JSON export holds (#326, ADR 0021), built in the browser (ADR 0023). The
 * page count is only known once laid out, so the footer is pdfmake's.
 */
export function buildClinicalRecordDocument(
    record: ClinicalRecordDocument,
    letterhead: Letterhead,
): TDocumentDefinitions {
    const organization = record.export.organization ?? '';

    return {
        pageSize: 'A4',
        pageMargins: [SIDE_MARGIN, 80, SIDE_MARGIN, 56],
        info: {
            title: `Historia clínica ${record.patient.id}`,
            creator: letterhead.brandName,
        },
        header: () => header(organization, letterhead),
        pageBreakBefore: keepTitlesWithContent,
        footer: (currentPage, pageCount) => ({
            margin: [SIDE_MARGIN, 20, SIDE_MARGIN, 0],
            columns: [
                {
                    text: `Historia clínica de ${record.patient.name} · ${organization}`,
                    style: 'footer',
                },
                {
                    text: `Página ${currentPage} de ${pageCount}`,
                    alignment: 'right',
                    style: 'footer',
                    width: 'auto',
                },
            ],
        }),
        content: [
            { text: 'Historia clínica', style: 'title' },
            { text: organization, style: 'muted' },
            {
                style: 'notice',
                table: {
                    widths: ['*'],
                    body: [
                        [
                            `Generada el ${at(record.export.generated_at)} por ${nameOf(record.export.generated_by)}. ${record.export.notice}`,
                        ],
                    ],
                },
                layout: {
                    hLineColor: () => BORDER,
                    vLineColor: () => BORDER,
                    paddingLeft: () => 8,
                    paddingRight: () => 8,
                    paddingTop: () => 6,
                    paddingBottom: () => 6,
                },
            },
            ...patientSection(record.patient),
            ...appointmentsSection(record.appointments),
            ...accessLogSection(record.access_log),
        ],
        defaultStyle: { fontSize: 10, color: TEXT, lineHeight: 1.25 },
        styles: {
            title: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
            section: { fontSize: 12, bold: true, margin: [0, 16, 0, 6] },
            appointmentTitle: { fontSize: 10.5, bold: true },
            appointment: { margin: [0, 0, 0, 12] },
            record: { margin: [12, 6, 0, 0] },
            version: { margin: [0, 4, 0, 6] },
            notice: { fontSize: 9, margin: [0, 10, 0, 6] },
            trail: { fontSize: 9 },
            muted: { color: MUTED },
            footer: { fontSize: 8, color: MUTED },
        },
    };
}
