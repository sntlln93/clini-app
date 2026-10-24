import {
    CLINICAL_ACCESS_ACTION_LABELS,
    CLINICAL_ACCESS_REASON_LABELS,
} from '@/lib/clinical-access';
import { formatShortDateTime } from '@/lib/datetime';
import type { ClinicalAccessTrailEntry } from '@/types/clinical-access';

/** Anchor of the patient page's access trail card. */
export const CLINICAL_ACCESS_TRAIL_ID = 'registro-de-accesos';

/**
 * Brings the trail card back into view once another page of it is on
 * screen: a load slower than the route's `pendingMs` swaps the page for its
 * skeleton, which is shorter, and the browser clamps the scroll meanwhile.
 */
export function scrollToClinicalAccessTrail(): void {
    document
        .getElementById(CLINICAL_ACCESS_TRAIL_ID)
        ?.scrollIntoView({ block: 'start' });
}

// What a row of the trail did, worded as the exported PDF words it: the action,
// then the listed reason, the appointment it touched or the export's format.
export function describeTrailEntry(entry: ClinicalAccessTrailEntry): string {
    const parts = [CLINICAL_ACCESS_ACTION_LABELS[entry.action]];

    if (entry.reason) {
        parts.push(`Motivo: ${CLINICAL_ACCESS_REASON_LABELS[entry.reason]}`);
    }

    if (entry.appointment) {
        parts.push(
            `Turno del ${formatShortDateTime(entry.appointment.start_at)}`,
        );
    }

    if (entry.export) {
        parts.push(
            entry.export.format.toUpperCase() +
                (entry.export.scope === 'attended_patients'
                    ? ', con todos sus pacientes atendidos'
                    : ''),
        );
    }

    return parts.join(' · ');
}
