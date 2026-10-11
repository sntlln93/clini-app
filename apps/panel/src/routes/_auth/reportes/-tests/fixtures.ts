import type { OrganizationReport, ReportBucket } from '@/types/report';

export function buildBucket(
    overrides: Partial<ReportBucket> = {},
): ReportBucket {
    return {
        start: '2026-09-07',
        end: '2026-09-13',
        published_minutes: 240,
        booked_minutes: 120,
        occupancy_rate: 0.5,
        attended: 3,
        no_show: 1,
        no_show_rate: 0.25,
        online: 1,
        manual: 3,
        ...overrides,
    };
}

export function buildReport(
    overrides: Partial<OrganizationReport> = {},
): OrganizationReport {
    return {
        period: {
            from: '2026-09-07',
            to: '2026-09-20',
            timezone: 'America/Argentina/Buenos_Aires',
            granularity: 'week',
        },
        professionals: [
            {
                membership_id: 5,
                name: 'Ana Pérez',
                published_minutes: 420,
                booked_minutes: 180,
                occupancy_rate: 0.4286,
                attended: 2,
                no_show: 1,
                no_show_rate: 0.3333,
            },
        ],
        series: [
            buildBucket(),
            buildBucket({
                start: '2026-09-14',
                end: '2026-09-20',
                published_minutes: 420,
                booked_minutes: 120,
                occupancy_rate: 0.2857,
                attended: 1,
                no_show: 1,
                no_show_rate: 0.5,
            }),
        ],
        origin: { online: 2, manual: 6 },
        new_patients: {
            total: 3,
            per_month: [{ month: '2026-09', count: 3 }],
        },
        ...overrides,
    };
}
