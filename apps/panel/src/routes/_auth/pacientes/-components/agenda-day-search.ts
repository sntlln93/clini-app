import { toDateInputValue } from '../../agenda/-components/agenda-dates';

/** Search params that open the agenda's day view on the (browser-local) day of `iso`. */
export function agendaDaySearch(iso: string) {
    return { date: toDateInputValue(new Date(iso)), view: 'day' as const };
}
