import type { Letterhead } from '@/lib/pdf/letterhead';
import { PDF_COLORS, PDF_FONT } from '@/lib/pdf/theme';
import { buildInvoice, buildPendingInvoice } from '@/tests/fixtures/invoice';
import type { Content } from 'pdfmake/interfaces';
import { describe, expect, it } from 'vitest';
import { buildInvoiceDocument, isIssued, type IssuedInvoice } from './document';

const LETTERHEAD: Letterhead = {
    brandName: 'Clini',
    logoSvg: '<svg id="logo"></svg>',
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

        return [node.text, node.stack, node.columns, table?.body]
            .filter((part) => part !== undefined)
            .map(textOf)
            .join('\n');
    }

    return '';
}

/** Every node of the content tree, flattened. */
function nodesOf(content: unknown): Record<string, unknown>[] {
    if (Array.isArray(content)) {
        return content.flatMap(nodesOf);
    }

    if (content && typeof content === 'object') {
        const node = content as Record<string, unknown>;
        const table = node.table as { body?: unknown } | undefined;

        return [
            node,
            ...nodesOf([node.stack, node.columns, table?.body].filter(Boolean)),
        ];
    }

    return [];
}

/** The fill a one-cell table (a pill, the innermost table holding its label) is drawn on. */
function fillOf(node: Record<string, unknown> | undefined): unknown {
    const layout = node?.layout as { fillColor?: () => unknown } | undefined;

    return layout?.fillColor?.();
}

function issued(...args: Parameters<typeof buildInvoice>): IssuedInvoice {
    const invoice = buildInvoice(...args);

    if (!isIssued(invoice)) {
        throw new Error('the fixture is issued');
    }

    return invoice;
}

function printed(invoice: IssuedInvoice = issued()): string {
    return textOf(
        buildInvoiceDocument(invoice, LETTERHEAD).content as Content,
    ).replace(/\s+/g, ' ');
}

const ANNUAL = {
    description: 'Suscripción anual a Clini, plan Consultorio',
    amount_cents: 10800000,
    service_to: '2027-10-02',
    annual_discount_percent: 40,
    annual_list_amount_cents: 18000000,
};

describe('buildInvoiceDocument', () => {
    it('prints a factura C with the issuer, the voucher and its code, as ARCA lays it out', () => {
        const text = printed();

        expect(text).toContain('Factura');
        expect(text).toContain('Original');
        expect(text).toContain('Cód. 011');
        // The voucher's letter, drawn in its box.
        expect(
            nodesOf(buildInvoiceDocument(issued(), LETTERHEAD).content).some(
                (node) => node.text === 'C' && node.fontSize === 26,
            ),
        ).toBe(true);
        // The point of sale and the voucher number, as ARCA numbers it.
        expect(text).toContain('00001-00000012');
        expect(text).toContain('Emitida el 03/10/2026');
        expect(text).toContain('Emisor de prueba');
        expect(text).toContain('Calle Falsa 123, CABA');
        expect(text).toContain(
            'Condición frente al IVA Responsable Monotributo',
        );
        expect(text).toContain('CUIT 20-11111111-2');
        expect(text).toContain('Ingresos Brutos 20-11111111-2');
        expect(text).toContain('Inicio de actividades 01/01/2026');
    });

    it('bills a final consumer the period the charge covers, with the year, for what was charged', () => {
        const text = printed();

        expect(text).toContain('Nombre Consumidor Final');
        expect(text).toContain('Condición frente al IVA Consumidor Final');
        expect(text).toContain('Período facturado desde 03/10/2026');
        expect(text).toContain('Hasta 02/11/2026');
        expect(text).toContain('Vencimiento del pago 03/10/2026');
        expect(text).toContain(
            'Suscripción mensual a Clini, plan Consultorio Del 03/10/2026 al 02/11/2026',
        );
        expect(text).toContain('Cant. Precio unitario Subtotal');
        expect(text).toContain('Subtotal $ 18.500,50');
        expect(text).toContain('Importe otros tributos $ 0,00');
        expect(text).toContain('Importe total $ 18.500,50');
    });

    it('says under the line of an annual charge what its discount saved, as a success pill', () => {
        const document = buildInvoiceDocument(issued(ANNUAL), LETTERHEAD);
        const note = '40 % de descuento: ahorraste $ 72.000,00';
        const pill = nodesOf(document.content).findLast(
            (node) =>
                'table' in node &&
                textOf(node).replace(/\s+/g, ' ').includes(note),
        );

        expect(printed(issued(ANNUAL))).toContain(
            `Suscripción anual a Clini, plan Consultorio Del 03/10/2026 al 02/10/2027 ${note}`,
        );
        // On `--success-wash`, as `StatusPill`'s `success` tone.
        expect(fillOf(pill)).toBe(PDF_COLORS.successWash);
    });

    it('claims no saving without the list price, or on a monthly charge', () => {
        expect(printed()).not.toContain('descuento');
        expect(
            printed(issued({ ...ANNUAL, annual_list_amount_cents: null })),
        ).not.toContain('descuento');
    });

    it('carries the CAE and the RG 4892 QR that checks it against ARCA', () => {
        const document = buildInvoiceDocument(issued(), LETTERHEAD);
        const qr = nodesOf(document.content).find((node) => 'qr' in node);

        expect(qr?.qr).toBe('https://www.arca.gob.ar/fe/qr/?p=eyJ2ZXIiOjF9');
        expect(printed()).toContain('Comprobante autorizado por ARCA');
        expect(printed()).toContain('CAE 76401234567890');
        expect(printed()).toContain('Vencimiento del CAE 13/10/2026');
        expect(printed()).toContain(
            'Escaneá el código para verificar este comprobante en ARCA.',
        );
        expect(document.info?.title).toBe('Factura C 00001-00000012');
    });

    it("says, as a warning pill, that a voucher outside ARCA's production services has no fiscal validity", () => {
        const notice = 'Prueba · sin validez fiscal';
        const test = buildInvoiceDocument(
            issued({}, { fiscally_valid: false }),
            LETTERHEAD,
        );
        const pill = nodesOf(test.content).findLast(
            (node) => 'table' in node && textOf(node).includes(notice),
        );

        expect(printed()).not.toContain('sin validez fiscal');
        expect(fillOf(pill)).toBe(PDF_COLORS.warningWash);
    });

    it('marks the voucher as the original, as an info pill', () => {
        const document = buildInvoiceDocument(issued(), LETTERHEAD);
        const pill = nodesOf(document.content).findLast(
            (node) => 'table' in node && textOf(node).trim() === 'Original',
        );

        expect(fillOf(pill)).toBe(PDF_COLORS.accent);
    });

    it('sets the theme’s typeface and text color', () => {
        const document = buildInvoiceDocument(issued(), LETTERHEAD);

        expect(document.defaultStyle).toMatchObject({
            font: PDF_FONT,
            color: PDF_COLORS.text,
        });
    });
});

describe('the brand on the invoice', () => {
    it('heads the voucher with the logotype and names the brand as its maker', () => {
        const document = buildInvoiceDocument(issued(), LETTERHEAD);
        const nodes = nodesOf(document.content);

        expect(nodes.find((node) => 'svg' in node)?.svg).toBe(
            '<svg id="logo"></svg>',
        );
        expect(document.info?.creator).toBe('Clini');
        expect(document.info?.producer).toBe('Clini');
    });

    it('names the brand when the logotype could not be read', () => {
        const document = buildInvoiceDocument(issued(), {
            brandName: 'Clini',
            logoSvg: null,
        });
        const nodes = nodesOf(document.content);

        expect(nodes.some((node) => 'svg' in node)).toBe(false);
        expect(nodes.some((node) => node.text === 'Clini')).toBe(true);
    });

    it('says on every page where the invoices are, and which page it is', () => {
        const document = buildInvoiceDocument(issued(), LETTERHEAD);
        const footer = textOf(
            (document.footer as (page: number, pages: number) => unknown)(1, 1),
        ).replace(/\s+/g, ' ');

        expect(footer).toContain(
            'Tus facturas están en Ajustes › Plan y suscripción.',
        );
        expect(footer).toContain('Página 1 de 1');
    });
});

describe('isIssued', () => {
    it('tells an issued invoice from a pending one', () => {
        expect(isIssued(buildInvoice())).toBe(true);
        expect(isIssued(buildPendingInvoice())).toBe(false);
    });
});
