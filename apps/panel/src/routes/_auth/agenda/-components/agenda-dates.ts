import { DateTime, startOfWeek } from '@/lib/datetime';
import type { AgendaViewMode } from './AgendaToolbar';

/** The agenda's API window for `date`: its day, or its Sunday-to-Saturday week, in the practice's zone. */
export function rangeFor(date: DateTime, view: AgendaViewMode) {
    return view === 'day'
        ? { start: date.startOf('day'), end: date.endOf('day') }
        : {
              start: startOfWeek(date),
              end: startOfWeek(date).plus({ days: 6 }).endOf('day'),
          };
}
