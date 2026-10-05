import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { OVERVIEW_PERIODS, type OverviewPeriod } from '@/types/overview';
import { useId } from 'react';

const PERIOD_ITEMS = OVERVIEW_PERIODS.map((days) => ({
    value: String(days),
    label: `Últimos ${days} días`,
}));

type PeriodSelectProps = {
    value: OverviewPeriod;
    onChange: (days: OverviewPeriod) => void;
};

export function PeriodSelect({ value, onChange }: PeriodSelectProps) {
    const triggerId = useId();

    return (
        <div className="flex flex-col gap-1">
            <Label htmlFor={triggerId}>Período</Label>
            <Select
                items={PERIOD_ITEMS}
                value={String(value)}
                onValueChange={(next) => {
                    if (next !== null) {
                        onChange(Number(next) as OverviewPeriod);
                    }
                }}
            >
                <SelectTrigger id={triggerId} className="w-44">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {PERIOD_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}
