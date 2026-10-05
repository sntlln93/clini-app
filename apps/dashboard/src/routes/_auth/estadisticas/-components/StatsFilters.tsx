import { DateRangeFields } from '@/features/date-range/DateRangeFields';
import { useDateRangeDraft } from '@/features/date-range/use-date-range-draft';
import { OrganizationPicker } from './OrganizationPicker';
import { effectiveRangeError } from './stats-range';

export type StatsFilterValues = {
    from?: string;
    to?: string;
    organization_id?: number;
};

type StatsFiltersProps = {
    /** The resolved range (URL value, or the API default echoed in `period`). */
    from: string;
    to: string;
    organization: { id: number; name: string } | null;
    onChange: (patch: StatsFilterValues) => void;
};

/**
 * Date edits are a local, debounced draft (`useDateRangeDraft`): only a range
 * the API accepts — an empty bound resolved to its default — reaches the URL.
 */
export function StatsFilters({
    from,
    to,
    organization,
    onChange,
}: StatsFiltersProps) {
    const range = useDateRangeDraft({
        from,
        to,
        validate: (next) => effectiveRangeError(next),
        onCommit: onChange,
    });

    return (
        <div className="flex flex-wrap items-start gap-4">
            <DateRangeFields
                from={range.draft.from}
                to={range.draft.to}
                onChange={range.change}
                error={range.error}
            />
            <OrganizationPicker
                selected={organization}
                onSelect={(organization_id) => onChange({ organization_id })}
            />
        </div>
    );
}
