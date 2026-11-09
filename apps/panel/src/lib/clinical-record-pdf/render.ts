import { loadBrandLogo } from '@/lib/pdf/brand-logo';
import { loadPdfMake } from '@/lib/pdf/pdfmake';
import type { ClinicalRecordDocument } from '@/types/clinical-record';
import { brand } from '@clini/brand';
import { buildClinicalRecordDocument } from './document';

/**
 * Builds the PDF of one patient's clinical history in the browser (ADR 0023).
 */
export async function renderClinicalRecordPdf(
    record: ClinicalRecordDocument,
): Promise<Blob> {
    const [pdfMake, logoSvg] = await Promise.all([
        loadPdfMake(),
        loadBrandLogo(),
    ]);

    return pdfMake
        .createPdf(
            buildClinicalRecordDocument(record, {
                brandName: brand.name,
                logoSvg,
            }),
        )
        .getBlob();
}
