import { api } from '@/lib/api';
import type { ProfessionalService } from '@/types/professional';
import { useQuery } from '@tanstack/react-query';

// The selected professional's services for the booking form; idle until a professional is picked.
export function useBookableServices(membershipId: number | null) {
    const { data } = useQuery({
        queryKey: ['professional-services', membershipId],
        queryFn: () =>
            api
                .get<{ data: ProfessionalService[] }>(
                    `/memberships/${membershipId}/services`,
                )
                .then((response) => response.data.data),
        enabled: membershipId !== null,
    });

    return data ?? [];
}
