import { fromInstant, toCalendarDate } from '@/lib/datetime';

/** Search params that open the agenda's day view on the practice's day of `iso`. */
export function agendaDaySearch(iso: string) {
    return { date: toCalendarDate(fromInstant(iso)), view: 'day' as const };
}
