import { buildClinicalRecord } from '@/tests/fixtures/clinical-record';
import { brand, brandAssetUrl } from '@clini/brand';
import type { DynamicContent, TDocumentDefinitions } from 'pdfmake/interfaces';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderClinicalRecordPdf } from './render';

const pdfMake = vi.hoisted(() => ({
    addVirtualFileSystem: vi.fn(),
    addFonts: vi.fn(),
    createPdf: vi.fn(),
}));

vi.mock('pdfmake/build/pdfmake', () => ({ default: pdfMake }));
vi.mock('pdfmake/build/vfs_fonts', () => ({ default: { 'Roboto.ttf': '' } }));

describe('renderClinicalRecordPdf', () => {
    const pdf = new Blob(['%PDF-'], { type: 'application/pdf' });

    beforeEach(() => {
        pdfMake.createPdf.mockReturnValue({
            getBlob: () => Promise.resolve(pdf),
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    /** The letterhead of the document handed to pdfmake. */
    function drawnHeader(): string {
        const document = pdfMake.createPdf.mock
            .calls[0][0] as TDocumentDefinitions;
        const header = document.header as DynamicContent;

        return JSON.stringify(
            header(1, 1, {
                width: 595.28,
                height: 841.89,
                orientation: 'portrait',
            }),
        );
    }

    /** The footer of the document handed to pdfmake. */
    function drawnFooter(): string {
        const document = pdfMake.createPdf.mock
            .calls[0][0] as TDocumentDefinitions;
        const footer = document.footer as DynamicContent;

        return JSON.stringify(
            footer(1, 1, {
                width: 595.28,
                height: 841.89,
                orientation: 'portrait',
            }),
        );
    }

    it('draws the record with the fonts and the logotype the panel serves', async () => {
        const fetch = vi.fn(() =>
            Promise.resolve(new Response('<svg id="logo"></svg>')),
        );
        vi.stubGlobal('fetch', fetch);

        await expect(
            renderClinicalRecordPdf(buildClinicalRecord()),
        ).resolves.toBe(pdf);

        expect(pdfMake.addVirtualFileSystem).toHaveBeenCalledWith({
            'Roboto.ttf': '',
        });
        expect(fetch).toHaveBeenCalledWith(
            brandAssetUrl(brand.assets.logotype.light),
        );
        expect(fetch).toHaveBeenCalledWith(
            brandAssetUrl(brand.assets.isotype.light),
        );
        expect(drawnHeader()).toContain('svg id=\\"logo\\"');
        expect(drawnFooter()).toContain('svg id=\\"logo\\"');
        expect(drawnFooter()).toContain('Generada con');

        const document = pdfMake.createPdf.mock
            .calls[0][0] as TDocumentDefinitions;
        expect(document.defaultStyle?.font).toBe('Outfit');
        expect(document.info).toMatchObject({
            creator: brand.name,
            producer: brand.name,
        });
    });

    // The download still happens, with the brand named instead.
    it('names the brand when the logotype does not load', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.reject(new TypeError('offline'))),
        );

        await renderClinicalRecordPdf(buildClinicalRecord());

        expect(drawnHeader()).not.toContain('"svg"');
        expect(drawnHeader()).toContain('Clini');
        expect(drawnFooter()).not.toContain('"svg"');
        expect(drawnFooter()).toContain('Generada con');
    });

    // nginx answers a missing brand file with index.html and a 200.
    it('names the brand when the logotype answers with something else', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve(
                    new Response('<!doctype html><html></html>', {
                        status: 200,
                        headers: { 'content-type': 'text/html' },
                    }),
                ),
            ),
        );

        await renderClinicalRecordPdf(buildClinicalRecord());

        expect(drawnHeader()).not.toContain('"svg"');
        expect(drawnHeader()).toContain('Clini');
    });
});
