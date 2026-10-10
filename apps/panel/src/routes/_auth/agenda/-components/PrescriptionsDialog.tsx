import { useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { extractFormErrors } from '@/lib/form-errors';
import { useSubscriptionRestricted } from '@/lib/subscription';
import type { Appointment } from '@/types/appointment';
import type { Prescription } from '@/types/prescription';
import { Link } from '@tanstack/react-router';
import { usePrescriptions } from '../-hooks/use-prescriptions';
import { PrescriptionForm } from './PrescriptionForm';

type PrescriptionsDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: Appointment | null;
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-AR', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

// Contextual dialog (ADR 0006): lists the acting membership's own
// prescriptions for this appointment and resolves issue/edit inline; printing
// opens the dedicated `/recetas/$id` view in a new tab.
export function PrescriptionsDialog({
    open,
    onOpenChange,
    appointment,
}: PrescriptionsDialogProps) {
    const appointmentId = appointment?.id ?? null;
    const query = usePrescriptions(appointmentId, open);
    const { data: prescriptions, isLoading } = query;
    // Read-only while the subscription is expired/cancelled (#28); printing stays available.
    const restricted = useSubscriptionRestricted();
    const fetchErrorMessage = query.isError
        ? extractFormErrors(query.error).message
        : null;

    const [editing, setEditing] = useState<Prescription | null>(null);

    // Adjust state during render (not a useEffect, per react-hooks/set-state-in-effect): clears the pending edit as soon as the dialog re-opens.
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setEditing(null);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90svh] overflow-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Recetas</DialogTitle>
                    <DialogDescription>
                        Solo vos podés ver y editar las recetas que emitiste en
                        este turno. No tienen validez como receta electrónica.
                    </DialogDescription>
                </DialogHeader>

                {fetchErrorMessage && (
                    <p className="text-sm text-destructive">
                        {fetchErrorMessage}
                    </p>
                )}

                <div className="space-y-3">
                    {isLoading && (
                        <p className="text-sm text-muted-foreground">
                            Cargando recetas…
                        </p>
                    )}
                    {!isLoading && prescriptions?.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            Todavía no emitiste recetas para este turno.
                        </p>
                    )}
                    {prescriptions?.map((prescription) => (
                        <div
                            key={prescription.id}
                            className="rounded-lg border p-3 text-sm"
                        >
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
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground tabular-nums">
                                    {formatDate(prescription.issued_at)}
                                </span>
                                <div className="flex gap-2">
                                    {!restricted && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                                setEditing(prescription)
                                            }
                                        >
                                            Editar
                                        </Button>
                                    )}
                                    <Link
                                        to="/recetas/$id"
                                        params={{ id: prescription.id }}
                                        target="_blank"
                                        className={buttonVariants({
                                            size: 'sm',
                                            variant: 'ghost',
                                        })}
                                    >
                                        Imprimir
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {!restricted && (
                    <PrescriptionForm
                        appointmentId={appointmentId}
                        open={open}
                        editing={editing}
                        onCancelEdit={() => setEditing(null)}
                        onSaved={() => setEditing(null)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
