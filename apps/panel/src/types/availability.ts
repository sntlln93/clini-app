export type Availability = {
    id: number;
    membership_id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
};

export type AvailabilityExceptionType = 'blocked' | 'extra';

export type AvailabilityException = {
    id: number;
    membership_id: number | null;
    type: AvailabilityExceptionType;
    start_at: string;
    end_at: string;
    reason: string | null;
};
