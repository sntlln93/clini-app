import { Button, buttonVariants } from '@/components/ui/button';
import type { Prescription } from '@/types/prescription';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
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
                <h1 className="text-2xl tracking-tight wrap-break-word">
                    {prescription.patient_name
                        ? `Receta de ${prescription.patient_name}`
                        : 'Receta'}
                </h1>
                <div className="flex flex-wrap gap-2">
                    <Link
                        to="/pacientes/$id"
                        params={{ id: prescription.patient_id }}
                        className={buttonVariants({ variant: 'outline' })}
                    >
                        <ArrowLeft data-icon="inline-start" aria-hidden />
                        Volver a la ficha
                    </Link>
                    <Button type="button" onClick={() => window.print()}>
                        Imprimir
                    </Button>
                </div>
            </header>
            <PrescriptionDocument prescription={prescription} />
        </div>
    );
}
