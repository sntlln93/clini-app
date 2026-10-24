import { Button } from '@/components/ui/button';
import { PrescriptionEntry } from '@/features/clinical-history/PrescriptionEntry';
import { formatShortDateTime } from '@/lib/datetime';
import type { Prescription } from '@/types/prescription';

type PrescriptionListProps = {
    prescriptions: Prescription[] | undefined;
    isLoading: boolean;
    restricted: boolean;
    onAmend: (prescription: Prescription) => void;
};

// The medication recorded in this appointment, each with its earlier versions.
export function PrescriptionList({
    prescriptions,
    isLoading,
    restricted,
    onAmend,
}: PrescriptionListProps) {
    return (
        <div className="space-y-3">
            {isLoading && (
                <p className="text-sm text-muted-foreground">
                    Cargando medicación…
                </p>
            )}
            {!isLoading && prescriptions?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Todavía no registraste medicación en este turno.
                </p>
            )}
            {prescriptions?.map((prescription) => (
                <PrescriptionEntry
                    key={prescription.id}
                    prescription={prescription}
                    meta={
                        <span className="tabular-nums">
                            {formatShortDateTime(prescription.issued_at)}
                        </span>
                    }
                    actions={
                        !restricted && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => onAmend(prescription)}
                            >
                                Enmendar
                            </Button>
                        )
                    }
                >
                    <ul className="list-inside list-disc">
                        {prescription.items.map((item) => (
                            <li key={item.id} className="wrap-break-word">
                                {item.medication} × {item.quantity}
                            </li>
                        ))}
                    </ul>
                </PrescriptionEntry>
            ))}
        </div>
    );
}
