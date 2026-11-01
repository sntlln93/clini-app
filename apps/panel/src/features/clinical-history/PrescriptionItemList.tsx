import { MedicationMarks } from '@/features/prescriptions/MedicationMarks';
import type { PrescriptionItem } from '@/types/prescription';

// The full detail of each indicated medication, with the marks of the catalog
// product it was picked from (#377).
export function PrescriptionItemList({ items }: { items: PrescriptionItem[] }) {
    return (
        <ul className="space-y-2">
            {items.map((item) => (
                <li key={item.id} className="space-y-1 wrap-break-word">
                    <p className="font-medium">
                        {item.medication}
                        {item.presentation && ` — ${item.presentation}`}
                    </p>
                    <p className="text-muted-foreground">
                        {item.dosage} · Cantidad: {item.quantity}
                    </p>
                    <MedicationMarks marks={item} />
                </li>
            ))}
        </ul>
    );
}
