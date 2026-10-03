import { Button } from '@/components/ui/button';
import type { Prescription } from '@/types/prescription';
import { PrescriptionDocument } from './PrescriptionDocument';

// The `recetas/$id` page body: an on-screen toolbar (hidden on paper) plus the document.
export function PrescriptionPrintView({
    prescription,
}: {
    prescription: Prescription;
}) {
    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4 print:hidden">
                <h1 className="text-2xl font-semibold">Receta</h1>
                <Button type="button" onClick={() => window.print()}>
                    Imprimir
                </Button>
            </header>
            <PrescriptionDocument prescription={prescription} />
        </div>
    );
}
