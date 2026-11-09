import { band } from '@/lib/pdf/blocks';
import { withFallbackFont } from '@/lib/pdf/glyphs';
import { PDF_COLORS, PDF_FONT } from '@/lib/pdf/theme';
import type { ClinicalRecordDocument } from '@/types/clinical-record';
import type {
    Content,
    Node,
    NodeQueries,
    TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { appointmentsSection } from './appointments';
import { backgroundSection } from './background';
import {
    clinicalRecordFooter,
    clinicalRecordHeader,
    SIDE_MARGIN,
    type ClinicalRecordLetterhead,
} from './branding';
import { PAGE_CHROME } from './nodes';
import { outsideAppointmentsSection } from './outside-appointments';
import { at, nameOf } from './records';
import { accessLogSection, documentOf, patientSection } from './sections';

/** The sentence the API closes every export's notice with. */
const NOT_A_PRESCRIPTION = 'Este documento no es una receta.';

/**
 * Moves a title (a section's, an appointment's heading, a subtitle) to the
 * next page when nothing of what it titles would follow it on this one.
 * Another title, a stack wrapping it, and the page's header and footer,
 * which pdfmake also lists among the following nodes, don't count: pdfmake
 * checks each node only once, so a title followed only by another title
 * that moves would otherwise stay behind alone.
 */
export function keepTitlesWithContent(
    node: Node,
    { getFollowingNodesOnPage }: NodeQueries,
): boolean {
    return (
        node.headlineLevel !== undefined &&
        getFollowingNodesOnPage().every(
            (following) =>
                following.style === PAGE_CHROME ||
                following.stack ||
                following.headlineLevel !== undefined,
        )
    );
}

/**
 * Who generated the export and when, then the API's notice, unchanged, its
 * closing «not a prescription» in bold.
 */
function notice(record: ClinicalRecordDocument): Content {
    const generated = `Generada el ${at(record.export.generated_at)} por ${nameOf(record.export.generated_by)}. `;
    const text = record.export.notice;

    return band(
        [
            {
                fontSize: 9,
                lineHeight: 1.35,
                text: text.endsWith(NOT_A_PRESCRIPTION)
                    ? [
                          generated,
                          text.slice(0, -NOT_A_PRESCRIPTION.length),
                          { text: NOT_A_PRESCRIPTION, bold: true },
                      ]
                    : [generated, text],
            },
        ],
        [0, 14, 0, 0],
    );
}

/** The first page's opening: the practice, the title and the patient. */
function cover(
    record: ClinicalRecordDocument,
    organization: string,
): Content[] {
    return [
        {
            text: organization,
            bold: true,
            fontSize: 9,
            color: PDF_COLORS.primary,
        },
        {
            text: 'Historia clínica',
            bold: true,
            fontSize: 22,
            lineHeight: 1.1,
            margin: [0, 3, 0, 3],
        },
        {
            text: `${record.patient.name} · ${documentOf(record.patient)}`,
            fontSize: 11,
            color: PDF_COLORS.muted,
        },
        notice(record),
    ];
}

/**
 * One patient's clinical history as a pdfmake document, the same shape the
 * JSON export holds (#326, ADR 0021), built in the browser (ADR 0023), in
 * the theme's colors and typeface (#432). The practice names every page;
 * Clini's brand accompanies it in the header and the footer.
 */
export function buildClinicalRecordDocument(
    record: ClinicalRecordDocument,
    letterhead: ClinicalRecordLetterhead,
): TDocumentDefinitions {
    const organization = record.export.organization ?? '';
    const patient = record.patient.name;
    const footer = clinicalRecordFooter(organization, patient, letterhead);

    return {
        pageSize: 'A4',
        pageMargins: [SIDE_MARGIN, 84, SIDE_MARGIN, 52],
        info: {
            title: `Historia clínica ${record.patient.id}`,
            creator: letterhead.brandName,
            producer: letterhead.brandName,
        },
        header: () =>
            withFallbackFont(
                clinicalRecordHeader(organization, patient, letterhead),
            ),
        footer: (currentPage, pageCount, pageSize) =>
            withFallbackFont(
                footer(currentPage, pageCount, pageSize) as Content,
            ),
        pageBreakBefore: keepTitlesWithContent,
        content: withFallbackFont([
            ...cover(record, organization),
            ...patientSection(record.patient),
            ...backgroundSection(record.blood_types, record.medical_history),
            ...appointmentsSection(record.appointments),
            ...outsideAppointmentsSection(record.outside_appointments),
            ...accessLogSection(record.access_log),
        ]),
        defaultStyle: {
            font: PDF_FONT,
            fontSize: 10,
            color: PDF_COLORS.text,
            lineHeight: 1.25,
        },
        styles: {
            section: {
                fontSize: 12,
                bold: true,
                color: PDF_COLORS.primary,
                margin: [0, 18, 0, 7],
            },
            label: { fontSize: 8.5, bold: true, color: PDF_COLORS.muted },
            meta: { fontSize: 9, color: PDF_COLORS.muted },
            muted: { color: PDF_COLORS.muted },
            recordKind: { fontSize: 10, bold: true, color: PDF_COLORS.primary },
            trail: { fontSize: 9 },
        },
    };
}
