import { buildInvoice, buildPendingInvoice } from '@/tests/fixtures/invoice';
import type { Content } from 'pdfmake/interfaces';
import { describe, expect, it } from 'vitest';
import type { InvoiceLetterhead } from './branding';
import { buildInvoiceDocument, isIssued, type IssuedInvoice } from './document';

const LETTERHEAD: InvoiceLetterhead = {
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

describe('buildInvoiceDocument', () => {
    it('prints a factura C with the issuer, the voucher and its code, as ARCA lays it out', () => {
        const text = printed();

        expect(text).toContain('FACTURA');
        expect(text).toContain('ORIGINAL');
        expect(text).toContain('COD. 011');
        expect(text).toMatch(/\bC\b/);
        expect(text).toContain('Punto de venta: 00001');
        expect(text).toContain('Comp. Nro: 00000012');
        expect(text).toContain('Fecha de emisión: 03/10/2026');
        expect(text).toContain('Emisor de prueba');
        expect(text).toContain('Domicilio comercial: Calle Falsa 123, CABA');
        expect(text).toContain(
            'Condición frente al IVA: Responsable Monotributo',
        );
        expect(text).toContain('CUIT: 20111111112');
        expect(text).toContain('Ingresos Brutos: 20111111112');
        expect(text).toContain('Fecha de inicio de actividades: 01/01/2026');
    });

    it('bills a final consumer the period the charge covers, for what was charged', () => {
        const text = printed();

        expect(text).toContain('Condición frente al IVA: Consumidor Final');
        expect(text).toContain('Período facturado desde: 03/10/2026');
        expect(text).toContain('Hasta: 02/11/2026');
        expect(text).toContain('Fecha de vto. para el pago: 03/10/2026');
        expect(text).toContain('Suscripción mensual a Clini, plan Consultorio');
        expect(text).toContain('Importe total: $ 18.500,50');
    });

    it('notes the annual discount under the line of an annual charge, and nothing on a monthly one', () => {
        expect(
            printed(
                issued({
                    description: 'Suscripción anual a Clini, plan Consultorio',
                    amount_cents: 10800000,
                    annual_discount_percent: 40,
                }),
            ),
        ).toContain(
            'Suscripción anual a Clini, plan Consultorio Pago anual, con 40 % de descuento sobre el precio mensual',
        );
        expect(printed()).not.toContain('descuento');
    });

    it('carries the CAE and the RG 4892 QR that checks it against ARCA', () => {
        const document = buildInvoiceDocument(issued(), LETTERHEAD);
        const qr = nodesOf(document.content).find((node) => 'qr' in node);

        expect(qr?.qr).toBe('https://www.arca.gob.ar/fe/qr/?p=eyJ2ZXIiOjF9');
        expect(printed()).toContain('CAE N°: 76401234567890');
        expect(printed()).toContain('Fecha de vto. de CAE: 13/10/2026');
        expect(document.info?.title).toBe('Factura C 00001-00000012');
    });

    it("says a voucher outside ARCA's production services has no fiscal validity", () => {
        expect(printed()).not.toContain('sin validez fiscal');
        expect(printed(issued({}, { fiscally_valid: false }))).toContain(
            'Comprobante de prueba: sin validez fiscal.',
        );
    });
});

describe('the brand on the invoice', () => {
    it('heads the voucher with the logotype and signs every page with the brand', () => {
        const document = buildInvoiceDocument(issued(), LETTERHEAD);
        const nodes = nodesOf(document.content);
        const footer = (document.footer as () => unknown)();

        expect(nodes.find((node) => 'svg' in node)?.svg).toBe(
            '<svg id="logo"></svg>',
        );
        expect(textOf(footer)).toContain('Clini');
    });

    it('names the brand when the logotype could not be read', () => {
        const document = buildInvoiceDocument(issued(), {
            brandName: 'Clini',
            logoSvg: null,
        });
        const nodes = nodesOf(document.content);

        expect(nodes.some((node) => 'svg' in node)).toBe(false);
        expect(textOf((document.content as Content[])[0]).trim()).toBe('Clini');
    });
});

describe('isIssued', () => {
    it('tells an issued invoice from a pending one', () => {
        expect(isIssued(buildInvoice())).toBe(true);
        expect(isIssued(buildPendingInvoice())).toBe(false);
    });
});
