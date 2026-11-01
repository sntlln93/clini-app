import { useState } from 'react';

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    seriesOf,
    TRACKED_FIELDS,
    VITAL_SIGN_FIELDS,
    type VitalSignField,
} from '@/lib/vital-signs';
import type { VitalSign } from '@/types/vital-sign';
import { DateEvolutionChart } from './DateEvolutionChart';

// The evolution of one followed value (#361): only the values some
// measurement holds are offered; annulled ones are left out.
export function VitalSignsEvolution({
    vitalSigns,
}: {
    vitalSigns: VitalSign[];
}) {
    const available = TRACKED_FIELDS.filter(
        (field) => seriesOf(vitalSigns, field).length > 0,
    );
    const [chosen, setChosen] = useState<VitalSignField | null>(null);
    const field =
        chosen !== null && available.includes(chosen) ? chosen : available[0];

    if (field === undefined) {
        return null;
    }

    const series = seriesOf(vitalSigns, field);
    const items = available.map((key) => ({
        value: key,
        label: VITAL_SIGN_FIELDS[key].label,
    }));

    return (
        <section aria-label="Evolución" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Evolución</h3>
                <Select
                    items={items}
                    value={field}
                    onValueChange={(value) =>
                        value !== null && setChosen(value as VitalSignField)
                    }
                >
                    <SelectTrigger
                        aria-label="Dato"
                        className="w-full max-w-56"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {items.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            <DateEvolutionChart field={field} series={series} />
        </section>
    );
}
