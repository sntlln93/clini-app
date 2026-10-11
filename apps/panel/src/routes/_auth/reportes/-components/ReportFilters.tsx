import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DateRangeFields } from '@/features/date-range/DateRangeFields';
import { useDateRangeDraft } from '@/features/date-range/use-date-range-draft';
import { todayInTimeZone } from '@/lib/iso-date';
import type { Professional } from '@/types/professional';
import type { ReportGranularity } from '@/types/report';
import { useId, useMemo } from 'react';
import { effectiveRangeError } from './report-range';

export type ReportFilterValues = {
    from?: string;
    to?: string;
    granularity?: ReportGranularity;
    membershipId?: number;
};

const ALL_PROFESSIONALS = 'all';

const GRANULARITY_ITEMS = [
    { value: 'month', label: 'Por mes' },
    { value: 'week', label: 'Por semana' },
];

type ReportFiltersProps = {
    /** The resolved period (URL value, or the API default echoed in `period`). */
    from: string;
    to: string;
    timezone: string;
    granularity: ReportGranularity;
    /** Only for a session that sees the whole organization; empty hides the picker. */
    professionals: Professional[];
    membershipId: number | undefined;
    onChange: (patch: ReportFilterValues) => void;
};

/**
 * Date edits are a local, debounced draft (`useDateRangeDraft`): only a range
 * the API accepts — an empty bound resolved to its default — reaches the URL.
 */
export function ReportFilters({
    from,
    to,
    timezone,
    granularity,
    professionals,
    membershipId,
    onChange,
}: ReportFiltersProps) {
    const granularityId = useId();
    const professionalId = useId();
    const range = useDateRangeDraft({
        from,
        to,
        validate: (next) =>
            effectiveRangeError(next, todayInTimeZone(timezone)),
        onCommit: onChange,
    });
    const professionalItems = useMemo(
        () => [
            { value: ALL_PROFESSIONALS, label: 'Todos los profesionales' },
            ...professionals.map((professional) => ({
                value: String(professional.id),
                label: professional.user.name || professional.user.email,
            })),
        ],
        [professionals],
    );

    return (
        <div className="flex flex-wrap items-start gap-4">
            <DateRangeFields
                from={range.draft.from}
                to={range.draft.to}
                onChange={range.change}
                error={range.error}
            />
            <div className="space-y-1">
                <Label htmlFor={granularityId}>Agrupar</Label>
                <Select
                    items={GRANULARITY_ITEMS}
                    value={granularity}
                    onValueChange={(value) =>
                        onChange({ granularity: value as ReportGranularity })
                    }
                >
                    <SelectTrigger id={granularityId} className="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {GRANULARITY_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {professionals.length > 0 && (
                <div className="space-y-1">
                    <Label htmlFor={professionalId}>Profesional</Label>
                    <Select
                        items={professionalItems}
                        value={
                            membershipId === undefined
                                ? ALL_PROFESSIONALS
                                : String(membershipId)
                        }
                        onValueChange={(value) =>
                            onChange({
                                membershipId:
                                    value === ALL_PROFESSIONALS
                                        ? undefined
                                        : Number(value),
                            })
                        }
                    >
                        <SelectTrigger
                            id={professionalId}
                            className="w-full sm:w-64"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {professionalItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );
}
