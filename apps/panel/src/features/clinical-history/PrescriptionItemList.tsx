import type { PrescriptionItem } from '@/types/prescription';

// The full detail of each indicated medication.
export function PrescriptionItemList({ items }: { items: PrescriptionItem[] }) {
    return (
        <ul className="space-y-2">
            {items.map((item) => (
                <li key={item.id} className="wrap-break-word">
                    <p className="font-medium">
                        {item.medication}
                        {item.presentation && ` — ${item.presentation}`}
                    </p>
                    <p className="text-muted-foreground">
                        {item.dosage} · Cantidad: {item.quantity}
                    </p>
                </li>
            ))}
        </ul>
    );
}
