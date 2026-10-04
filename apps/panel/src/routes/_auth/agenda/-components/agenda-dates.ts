import type { AgendaViewMode } from './AgendaToolbar';

export function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

export function endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function startOfWeek(date: Date): Date {
    const result = startOfDay(date);
    result.setDate(result.getDate() - result.getDay());
    return result;
}

export function endOfWeek(date: Date): Date {
    return endOfDay(addDays(startOfWeek(date), 6));
}

export function toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function fromDateInputValue(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
}

export function rangeFor(date: Date, view: AgendaViewMode) {
    return view === 'day'
        ? { start: startOfDay(date), end: endOfDay(date) }
        : { start: startOfWeek(date), end: endOfWeek(date) };
}

// Reads the date/time inputs as browser-local time (not `organizations.timezone`, see #230 A1) and sends a UTC instant, since the API parses an offset-less string as UTC.
export function toInstant(date: string, time: string): string {
    return new Date(`${date}T${time}`).toISOString();
}

export function toTimeInputValue(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}
