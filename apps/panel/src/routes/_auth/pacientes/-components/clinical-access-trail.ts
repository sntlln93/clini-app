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
