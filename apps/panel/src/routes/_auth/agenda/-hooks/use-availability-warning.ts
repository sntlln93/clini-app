import { api } from '@/lib/api';
import type { Availability, AvailabilityException } from '@/types/availability';
import { useQuery } from '@tanstack/react-query';

// `blocked` exceptions remove availability, `extra` add it; `day_of_week`/`Date#getDay()` share the 0 = Sunday convention.
export function isOutsideAvailability(
    dateTime: Date,
    availabilities: Availability[],
    exceptions: AvailabilityException[],
): boolean {
    const dayOfWeek = dateTime.getDay();
    const time = toTimeString(dateTime);

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
    dateTime: Date,
    exception: AvailabilityException,
): boolean {
    const start = new Date(exception.start_at);
    const end = new Date(exception.end_at);

    return dateTime >= start && dateTime < end;
}

function toTimeString(dateTime: Date): string {
    return dateTime.toTimeString().slice(0, 8);
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

    const isOutside = (dateTime: Date): boolean => {
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
