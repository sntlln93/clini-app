export type ReportGranularity = 'week' | 'month';

type OccupancyFields = {
    published_minutes: number;
    /** Only the minutes inside the published schedule. */
    booked_minutes: number;
    /** 0..1, or null when nothing was published. */
    occupancy_rate: number | null;
};

type NoShowFields = {
    /** `arrived` or `completed`. */
    attended: number;
    no_show: number;
    /** 0..1 over attended + no-show, or null when none reached their time. */
    no_show_rate: number | null;
};

export type ProfessionalReport = OccupancyFields &
    NoShowFields & {
        membership_id: number;
        name: string | null;
    };

/** A calendar week or month, cut to the period. */
export type ReportBucket = OccupancyFields &
    NoShowFields & {
        start: string;
        end: string;
        online: number;
        manual: number;
    };

/** GET /reports's `data` (#242). */
export type OrganizationReport = {
    period: {
        from: string;
        to: string;
        timezone: string;
        granularity: ReportGranularity;
    };
    professionals: ProfessionalReport[];
    series: ReportBucket[];
    origin: { online: number; manual: number };
    /** Null when the report covers a single professional. */
    new_patients: {
        total: number;
        per_month: { month: string; count: number }[];
    } | null;
};
