import { StatusPill } from '@/components/StatusPill';
import { medicationMarks } from '@/lib/medication-marks';
import type { MedicationMarks as Marks } from '@/types/medication';

// A catalog product's control mark and dispensing condition (#377), shown on
// its suggestion, on the picked item and in the history: they mark it, they
// never block it.
export function MedicationMarks({ marks }: { marks: Marks }) {
    const shown = medicationMarks(marks);

    if (shown.length === 0) {
        return null;
    }

    return (
        <span className="flex flex-wrap gap-1">
            {shown.map((mark) => (
                <StatusPill key={mark.label} tone={mark.tone}>
                    {mark.label}
                </StatusPill>
            ))}
        </span>
    );
}
