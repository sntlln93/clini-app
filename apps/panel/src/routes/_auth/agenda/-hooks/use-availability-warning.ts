import { api } from '@/lib/api';
import { type DateTime, fromInstant } from '@/lib/datetime';
import type { Availability, AvailabilityException } from '@/types/availability';
import { useQuery } from '@tanstack/react-query';

// blocked exceptions remove availability, extra add it; day_of_week is 0=Sunday, like disponibilidad's WeeklyAvailabilitySection (Luxon's weekday is 1=Monday…7=Sunday).
export function isOutsideAvailability(
    dateTime: DateTime,
    availabilities: Availability[],
    exceptions: AvailabilityException[],
): boolean {
    // The weekly slots are clock times in the practice's zone, which is `dateTime`'s.
    const dayOfWeek = dateTime.weekday % 7;
    const time = dateTime.toFormat('HH:mm:ss');

    const withinRecurring = availabilities.some(
        (slot) =>
            slot.day_of_week === dayOfWeek &&
            time >= slot.start_time &&
            time < slot.end_time,
    );

    const withinExtra = exceptions.some(
        (exception) =>
            exception.type === 'extra' &&
            isWithinExceptionWindow(dateTime, exception),
    );

    const withinBlocked = exceptions.some(
        (exception) =>
            exception.type === 'blocked' &&
            isWithinExceptionWindow(dateTime, exception),
    );

    const available = (withinRecurring || withinExtra) && !withinBlocked;

    return !available;
}

function isWithinExceptionWindow(
    dateTime: DateTime,
    exception: AvailabilityException,
): boolean {
    return (
        dateTime >= fromInstant(exception.start_at) &&
        dateTime < fromInstant(exception.end_at)
    );
}

export function useAvailabilityWarning(membershipId: number | null) {
    const availabilitiesQuery = useQuery({
        queryKey: ['availabilities', membershipId],
        queryFn: () =>
            api
                .get<{ data: Availability[] }>(
                    `/memberships/${membershipId}/availabilities`,
                )
                .then((response) => response.data.data),
        enabled: membershipId !== null,
    });

    const exceptionsQuery = useQuery({
        queryKey: ['availability-exceptions', membershipId],
        queryFn: () =>
            api
                .get<{ data: AvailabilityException[] }>(
                    '/availability-exceptions',
                    { params: { membership_id: membershipId } },
                )
                .then((response) => response.data.data),
        enabled: membershipId !== null,
    });

    const isOutside = (dateTime: DateTime): boolean => {
        if (membershipId === null) {
            return false;
        }

        return isOutsideAvailability(
            dateTime,
            availabilitiesQuery.data ?? [],
            exceptionsQuery.data ?? [],
        );
    };

    return {
        isOutside,
        isLoading: availabilitiesQuery.isLoading || exceptionsQuery.isLoading,
    };
}
