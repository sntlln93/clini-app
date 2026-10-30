import { formatShortDateTime } from '@/lib/datetime';
import {
    formatVitalSignValue,
    latestValues,
    VITAL_SIGN_FIELDS,
} from '@/lib/vital-signs';
import type { VitalSign } from '@/types/vital-sign';

// Each value's latest reading with when it was taken (#361): the newest
// measurement may not hold every value, and an annulled one doesn't count.
export function LatestVitalSigns({ vitalSigns }: { vitalSigns: VitalSign[] }) {
    const latest = latestValues(vitalSigns);

    if (latest.length === 0) {
        return null;
    }

    return (
        <section aria-label="Últimos valores">
            <h3 className="mb-2 text-sm font-medium">Últimos valores</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm xl:grid-cols-3">
                {latest.map(({ field, value, measuredAt }) => (
                    <div key={field} className="min-w-0">
                        <dt className="text-muted-foreground">
                            {VITAL_SIGN_FIELDS[field].label}
                        </dt>
                        <dd className="font-medium tabular-nums">
                            {formatVitalSignValue(field, value)}
                        </dd>
                        <dd className="text-xs text-muted-foreground tabular-nums">
                            {formatShortDateTime(measuredAt)}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
