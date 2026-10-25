/** The DOM id of an appointment's block in the agenda's day grid, so a link's hash scrolls the day to it (#343). */
export function appointmentAnchorId(appointmentId: number): string {
    return `turno-${appointmentId}`;
}
