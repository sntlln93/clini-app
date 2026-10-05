import { Button } from '@/components/ui/button';
import { FilterSelect } from '@/features/filter-select/FilterSelect';
import { Searchbar } from '@/features/Searchbar';
import { SUBSCRIPTION_STATUS_LABELS } from '@/lib/labels';
import {
    SUBSCRIPTION_STATUSES,
    type SubscriptionStatus,
} from '@/types/subscription';
import { Hourglass } from 'lucide-react';

/** The quick filter's window, in days. */
export const GRACE_ENDING_SOON_DAYS = 7;

const STATUS_OPTIONS = SUBSCRIPTION_STATUSES.map((status) => ({
    value: status,
    label: SUBSCRIPTION_STATUS_LABELS[status],
}));

export type SubscriptionFilterValues = {
    q: string;
    status?: SubscriptionStatus;
    graceWithin?: number;
};

type SubscriptionFiltersProps = {
    values: SubscriptionFilterValues;
    onChange: (patch: Partial<SubscriptionFilterValues>) => void;
};

export function SubscriptionFilters({
    values,
    onChange,
}: SubscriptionFiltersProps) {
    const graceActive = values.graceWithin !== undefined;

    return (
        <div className="flex flex-wrap items-end gap-4">
            <Searchbar
                value={values.q}
                onSearch={(q) => onChange({ q })}
                placeholder="Buscar por organización…"
                label="Buscar suscripciones por organización"
                className="max-w-sm"
            />
            {/* The API ignores `status` while the grace window is set, so the select steps aside. */}
            {!graceActive && (
                <FilterSelect
                    label="Estado"
                    value={values.status}
                    options={STATUS_OPTIONS}
                    allLabel="Todos"
                    onChange={(status) => onChange({ status })}
                />
            )}
            <Button
                type="button"
                variant={graceActive ? 'secondary' : 'outline'}
                aria-pressed={graceActive}
                onClick={() =>
                    onChange(
                        graceActive
                            ? { graceWithin: undefined }
                            : {
                                  graceWithin: GRACE_ENDING_SOON_DAYS,
                                  status: undefined,
                              },
                    )
                }
            >
                <Hourglass data-icon="inline-start" />
                Gracia por vencer ({GRACE_ENDING_SOON_DAYS} días)
            </Button>
        </div>
    );
}
