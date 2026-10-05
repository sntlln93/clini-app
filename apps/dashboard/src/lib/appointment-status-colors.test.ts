import { APPOINTMENT_ORIGINS, APPOINTMENT_STATUSES } from '@/types/stats';
import { describe, expect, it } from 'vitest';
import {
    APPOINTMENT_ORIGIN_COLORS,
    APPOINTMENT_STATUS_COLORS,
} from './appointment-status-colors';

describe('appointment status colors', () => {
    it('gives every status a --status-* token of the theme', () => {
        for (const status of APPOINTMENT_STATUSES) {
            expect(APPOINTMENT_STATUS_COLORS[status]).toMatch(
                /^var\(--status-[a-z-]+\)$/,
            );
        }
        expect(APPOINTMENT_STATUS_COLORS.no_show).toBe('var(--status-no-show)');
        expect(APPOINTMENT_STATUS_COLORS.cancelled).toBe(
            'var(--status-scheduled)',
        );
    });

    it('paints online bookings with the amber origin mark', () => {
        for (const origin of APPOINTMENT_ORIGINS) {
            expect(APPOINTMENT_ORIGIN_COLORS[origin]).toBeTruthy();
        }
        expect(APPOINTMENT_ORIGIN_COLORS.online).toBe('var(--status-online)');
    });
});
