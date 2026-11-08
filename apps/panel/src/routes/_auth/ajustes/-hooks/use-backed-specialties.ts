import { api } from '@/lib/api';
import type { Specialty } from '@/types/professional';
import { queryOptions } from '@tanstack/react-query';

/** Every key of a professional's backed specialties, to drop them all at once. */
export const BACKED_SPECIALTIES_KEY = ['backed-specialties'];

/**
 * What a professional's verified licenses back (#387): the only specialties
 * the practice may offer them with. The registry decides them.
 */
export function backedSpecialtiesQueryOptions(membershipId: number) {
    return queryOptions({
        queryKey: [...BACKED_SPECIALTIES_KEY, membershipId],
        queryFn: () =>
            api
                .get<{
                    data: Specialty[];
                }>(`/memberships/${membershipId}/backed-specialties`)
                .then((response) => response.data.data),
    });
}
