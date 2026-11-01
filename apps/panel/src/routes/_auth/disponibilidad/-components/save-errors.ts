import { extractFormErrors } from '@/lib/form-errors';
import type { SlotPayload } from './week-draft';
import { DAY_NAMES } from './week-labels';

const SLOT_KEY = /^slots\.(\d+)/;

/**
 * Turns a failed save into the lines the page shows. A 422 on `slots.N.*` names
 * the franja it refers to, read from the body that was sent (the API indexes
 * its errors by it), since the draft may have changed since.
 */
export function saveErrorMessages(
    error: unknown,
    sent: readonly SlotPayload[],
): string[] {
    const { message, errors } = extractFormErrors(error);
    const entries = Object.entries(errors);

    if (entries.length === 0) {
        return [message ?? 'No se pudieron guardar los horarios.'];
    }

    const lines = entries.map(([key, text]) => {
        const index = SLOT_KEY.exec(key)?.[1];
        const slot = index === undefined ? undefined : sent.at(Number(index));

        return slot
            ? `${DAY_NAMES[slot.day_of_week]} de ${slot.start_time} a ${slot.end_time}: ${text}`
            : text;
    });

    return [...new Set(lines)];
}
