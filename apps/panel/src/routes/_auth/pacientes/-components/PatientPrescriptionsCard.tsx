import { buttonVariants } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { Prescription } from '@/types/prescription';
import { Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-AR', { dateStyle: 'short' });
}

// Read-only list of the acting membership's own prescriptions for this
// patient (issue #31); they're issued/edited from the appointment in the agenda.
export function PatientPrescriptionsCard({
    prescriptions,
}: {
    prescriptions: Prescription[];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Recetas</CardTitle>
                <CardDescription>
                    Solo ves las recetas que emitiste vos.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {prescriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Todavía no emitiste recetas para este paciente.
                    </p>
                ) : (
                    prescriptions.map((prescription) => (
                        <div
                            key={prescription.id}
                            className="rounded-lg border p-3 text-sm"
                        >
                            {prescription.diagnosis && (
                                <p className="font-medium wrap-break-word">
                                    {prescription.diagnosis}
                                </p>
                            )}
                            <ul className="list-inside list-disc">
                                {prescription.items.map((item) => (
                                    <li
                                        key={item.id}
                                        className="wrap-break-word"
                                    >
                                        {item.medication} × {item.quantity}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span className="tabular-nums">
                                    {formatDate(prescription.issued_at)}
                                </span>
                                <Link
                                    to="/recetas/$id"
                                    params={{ id: prescription.id }}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={buttonVariants({
                                        size: 'sm',
                                        variant: 'ghost',
                                    })}
                                >
                                    Ver / imprimir{' '}
                                    <span className="sr-only">
                                        (se abre en una pestaña nueva)
                                    </span>
                                    <ExternalLink
                                        data-icon="inline-end"
                                        aria-hidden
                                    />
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
