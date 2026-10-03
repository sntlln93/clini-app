import type { DocumentType } from '@/types/patient';
import type { Prescription } from '@/types/prescription';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
    dni: 'DNI',
    passport: 'Pasaporte',
    insurance_id: 'Carnet de obra social',
};

export const NOT_VALID_LEGEND = 'Documento sin validez como receta electrónica';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-AR', { dateStyle: 'long' });
}

// The printable body of a prescription (issue #31). Not a legally valid
// electronic prescription (Ley 27.553 is out of scope), hence the legend.
export function PrescriptionDocument({
    prescription,
}: {
    prescription: Prescription;
}) {
    const document =
        prescription.patient_document_type &&
        prescription.patient_document_number
            ? `${DOCUMENT_TYPE_LABELS[prescription.patient_document_type]} ${prescription.patient_document_number}`
            : null;

    return (
        <article className="mx-auto max-w-2xl space-y-6 rounded-lg border bg-background p-6 text-foreground print:max-w-none print:rounded-none print:border-0 print:p-0 print:text-black">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                <div className="min-w-0">
                    <p className="text-lg font-semibold wrap-break-word">
                        {prescription.author_name ?? 'Profesional'}
                    </p>
                    {prescription.author_specialties.length > 0 && (
                        <p className="text-sm text-muted-foreground print:text-black">
                            {prescription.author_specialties.join(' · ')}
                        </p>
                    )}
                </div>
                <p className="text-sm">
                    Fecha: <time>{formatDate(prescription.issued_at)}</time>
                </p>
            </header>

            <section aria-label="Paciente" className="space-y-1 text-sm">
                <p>
                    <span className="font-medium">Paciente:</span>{' '}
                    {prescription.patient_name ?? '—'}
                </p>
                {document && (
                    <p>
                        <span className="font-medium">Documento:</span>{' '}
                        {document}
                    </p>
                )}
                {prescription.diagnosis && (
                    <p className="wrap-break-word whitespace-pre-wrap">
                        <span className="font-medium">Diagnóstico:</span>{' '}
                        {prescription.diagnosis}
                    </p>
                )}
            </section>

            <section aria-label="Medicamentos" className="space-y-3">
                <h2 className="text-base font-semibold">Rp/</h2>
                <ol className="list-decimal space-y-3 pl-5 text-sm">
                    {prescription.items.map((item) => (
                        <li key={item.id} className="wrap-break-word">
                            <p className="font-medium">
                                {item.medication}
                                {item.presentation && ` — ${item.presentation}`}
                            </p>
                            <p>Cantidad: {item.quantity}</p>
                            <p>Indicaciones: {item.dosage}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <footer className="border-t pt-4 text-center text-sm font-semibold tracking-wide uppercase">
                {NOT_VALID_LEGEND}
            </footer>
        </article>
    );
}
