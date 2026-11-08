import { buildInvoice, buildPendingInvoice } from '@/tests/fixtures/invoice';
import type { Content } from 'pdfmake/interfaces';
import { describe, expect, it } from 'vitest';
import { buildInvoiceDocument, isIssued, type IssuedInvoice } from './document';

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
    return textOf(buildInvoiceDocument(invoice).content as Content).replace(
        /\s+/g,
        ' ',
    );
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

    it('carries the CAE and the RG 4892 QR that checks it against ARCA', () => {
        const document = buildInvoiceDocument(issued());
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

describe('isIssued', () => {
    it('tells an issued invoice from a pending one', () => {
        expect(isIssued(buildInvoice())).toBe(true);
        expect(isIssued(buildPendingInvoice())).toBe(false);
    });
});
