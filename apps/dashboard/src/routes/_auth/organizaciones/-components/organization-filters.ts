import { SUBSCRIPTION_STATUS_LABELS } from '@/lib/labels';
import type {
    OrganizationStateFilter,
    OrganizationSubscriptionFilter,
} from '@/types/organization';
import type {
    OrganizationSort,
    SortDirection,
} from '../-hooks/use-organizations';

export const STATE_OPTIONS: ReadonlyArray<{
    value: OrganizationStateFilter;
    label: string;
}> = [
    { value: 'active', label: 'Activas' },
    { value: 'suspended', label: 'Suspendidas' },
];

export const SUBSCRIPTION_OPTIONS: ReadonlyArray<{
    value: OrganizationSubscriptionFilter;
    label: string;
}> = [
    { value: 'none', label: 'Sin suscripción' },
    { value: 'pending', label: SUBSCRIPTION_STATUS_LABELS.pending },
    { value: 'active', label: SUBSCRIPTION_STATUS_LABELS.active },
    { value: 'grace', label: SUBSCRIPTION_STATUS_LABELS.grace },
    { value: 'expired', label: SUBSCRIPTION_STATUS_LABELS.expired },
    { value: 'cancelled', label: SUBSCRIPTION_STATUS_LABELS.cancelled },
];

/** Sort + direction folded into one select; the default (newest first) is "no sort param". */
export type SortOption = 'oldest' | 'name_asc' | 'name_desc';

export const SORT_OPTIONS: ReadonlyArray<{ value: SortOption; label: string }> =
    [
        { value: 'oldest', label: 'Más antiguas primero' },
        { value: 'name_asc', label: 'Nombre (A–Z)' },
        { value: 'name_desc', label: 'Nombre (Z–A)' },
    ];

const SORT_PARAMS: Record<
    SortOption,
    { sort: OrganizationSort; direction: SortDirection }
> = {
    oldest: { sort: 'created_at', direction: 'asc' },
    name_asc: { sort: 'name', direction: 'asc' },
    name_desc: { sort: 'name', direction: 'desc' },
};

export function sortParams(option: SortOption | undefined) {
    return option ? SORT_PARAMS[option] : {};
}

export function sortOptionFor(
    sort: OrganizationSort | undefined,
    direction: SortDirection | undefined,
): SortOption | undefined {
    if (sort === 'name') {
        return direction === 'desc' ? 'name_desc' : 'name_asc';
    }

    return direction === 'asc' ? 'oldest' : undefined;
}
