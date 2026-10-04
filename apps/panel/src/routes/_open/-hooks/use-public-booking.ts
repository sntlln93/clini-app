import { api } from '@/lib/api';
import type {
    AvailableSlot,
    BookingOrganizationResponse,
} from '@/types/booking';
import { queryOptions } from '@tanstack/react-query';

/** Fully public endpoints: no session, no auth headers. */
export function bookingOrganizationQueryOptions(slug: string) {
    return queryOptions({
        queryKey: ['booking', slug, 'organization'],
        queryFn: () =>
            api
                .get<BookingOrganizationResponse>(`/booking/${slug}`)
                .then((response) => response.data),
    });
}

type SlotsParams = {
    slug: string;
    membershipId: number;
    serviceId: number;
    from: string;
    to: string;
};

export function bookingSlotsQueryOptions(params: SlotsParams) {
    return queryOptions({
        queryKey: [
            'booking',
            params.slug,
            'slots',
            params.membershipId,
            params.serviceId,
            params.from,
            params.to,
        ],
        queryFn: () =>
            api
                .get<{ data: AvailableSlot[] }>(
                    `/booking/${params.slug}/slots`,
                    {
                        params: {
                            membership_id: params.membershipId,
                            service_id: params.serviceId,
                            from: params.from,
                            to: params.to,
                        },
                    },
                )
                .then((response) => response.data.data),
    });
}
