import { FilterSelect } from '@/features/filter-select/FilterSelect';
import { Searchbar } from '@/features/Searchbar';
import type {
    OrganizationStateFilter,
    OrganizationSubscriptionFilter,
} from '@/types/organization';
import {
    SORT_OPTIONS,
    STATE_OPTIONS,
    SUBSCRIPTION_OPTIONS,
    type SortOption,
} from './organization-filters';

export type OrganizationFilterValues = {
    q: string;
    status?: OrganizationStateFilter;
    subscription_status?: OrganizationSubscriptionFilter;
    order?: SortOption;
};

type OrganizationFiltersProps = {
    values: OrganizationFilterValues;
    onChange: (patch: Partial<OrganizationFilterValues>) => void;
};

export function OrganizationFilters({
    values,
    onChange,
}: OrganizationFiltersProps) {
    return (
        <div className="flex flex-wrap items-end gap-4">
            <Searchbar
                value={values.q}
                onSearch={(q) => onChange({ q })}
                placeholder="Buscar por nombre o slug…"
                label="Buscar organizaciones"
                className="max-w-sm"
            />
            <FilterSelect
                label="Estado"
                value={values.status}
                options={STATE_OPTIONS}
                allLabel="Todas"
                onChange={(status) => onChange({ status })}
            />
            <FilterSelect
                label="Suscripción"
                value={values.subscription_status}
                options={SUBSCRIPTION_OPTIONS}
                allLabel="Todas"
                onChange={(subscription_status) =>
                    onChange({ subscription_status })
                }
            />
            <FilterSelect
                label="Orden"
                value={values.order}
                options={SORT_OPTIONS}
                allLabel="Más recientes primero"
                onChange={(order) => onChange({ order })}
            />
        </div>
    );
}
