import type { ReportBucket } from '@/types/report';

export type ReportTotals = {
    publishedMinutes: number;
    bookedMinutes: number;
    occupancyRate: number | null;
    attended: number;
    noShow: number;
    noShowRate: number | null;
    online: number;
    manual: number;
    onlineRate: number | null;
};

function rate(numerator: number, denominator: number): number | null {
    return denominator <= 0 ? null : numerator / denominator;
}

/** The whole period, summed from its buckets (each bucket already covers every professional in the report). */
export function reportTotals(series: ReportBucket[]): ReportTotals {
    const sum = (key: keyof ReportBucket) =>
        series.reduce((total, bucket) => total + Number(bucket[key]), 0);
    const publishedMinutes = sum('published_minutes');
    const bookedMinutes = sum('booked_minutes');
    const attended = sum('attended');
    const noShow = sum('no_show');
    const online = sum('online');
    const manual = sum('manual');

    return {
        publishedMinutes,
        bookedMinutes,
        occupancyRate: rate(bookedMinutes, publishedMinutes),
        attended,
        noShow,
        noShowRate: rate(noShow, attended + noShow),
        online,
        manual,
        onlineRate: rate(online, online + manual),
    };
}
