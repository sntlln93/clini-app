import { STATUS_TONES } from '@/lib/appointment-status';
import { cn } from '@/lib/utils';

export type ClinicalRecordStatus = 'annulled' | 'amended';

const LABELS: Record<ClinicalRecordStatus, string> = {
    annulled: 'Anulada',
    amended: 'Enmendada',
};

// A clinical record's state reads in the agenda's colors, so the history
// speaks the same palette as the appointments it hangs from: annulled is the
// no-show red, amended the confirmed teal.
const TONES = {
    annulled: STATUS_TONES.no_show,
    amended: STATUS_TONES.confirmed,
} satisfies Record<ClinicalRecordStatus, unknown>;

type ClinicalRecordStatusChipProps = {
    status: ClinicalRecordStatus;
    className?: string;
};

// Same shape as `AppointmentStatusChip`: the label is always shown, color
// never carries the state on its own.
export function ClinicalRecordStatusChip({
    status,
    className,
}: ClinicalRecordStatusChipProps) {
    const tone = TONES[status];

    return (
        <span
            data-status={status}
            className={cn(
                'inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                tone.pill,
                className,
            )}
        >
            <span
                aria-hidden="true"
                className={cn('size-1.5 shrink-0 rounded-full', tone.dot)}
            />
            {LABELS[status]}
        </span>
    );
}
