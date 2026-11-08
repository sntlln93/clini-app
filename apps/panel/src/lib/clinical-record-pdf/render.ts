import { loadPdfMake } from '@/lib/pdf/pdfmake';
import type { ClinicalRecordDocument } from '@/types/clinical-record';
import { brand, brandAssetUrl } from '@clini/brand';
import { buildClinicalRecordDocument } from './document';

// pdfmake throws on anything but an SVG. A missing brand file still answers
// 200 in production, with the SPA's index.html (nginx's `try_files`).
function isSvg(response: Response, body: string): boolean {
    const type = response.headers.get('content-type') ?? '';
    const start = body.trimStart();

    return (
        type.includes('svg') ||
        start.startsWith('<svg') ||
        start.startsWith('<?xml')
    );
}

// The panel serves the manifest's files itself, so the letterhead's logotype
// is a same-origin read. Without it the letterhead names the brand instead.
async function loadLogo(): Promise<string | null> {
    try {
        const response = await fetch(
            brandAssetUrl(brand.assets.logotype.light),
        );

        if (!response.ok) {
            return null;
        }

        const body = await response.text();

        return isSvg(response, body) ? body : null;
    } catch {
        return null;
    }
}

/**
 * Builds the PDF of one patient's clinical history in the browser (ADR 0023).
 */
export async function renderClinicalRecordPdf(
    record: ClinicalRecordDocument,
): Promise<Blob> {
    const [pdfMake, logoSvg] = await Promise.all([loadPdfMake(), loadLogo()]);

    return pdfMake
        .createPdf(
            buildClinicalRecordDocument(record, {
                brandName: brand.name,
                logoSvg,
            }),
        )
        .getBlob();
}
