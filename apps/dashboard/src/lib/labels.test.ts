import { MEMBERSHIP_ROLES, MEMBERSHIP_STATUSES } from '@/types/admin';
import { AUDIT_ACTIONS, AUDIT_SUBJECT_TYPES } from '@/types/audit';
import { ACTIVITY_KINDS } from '@/types/overview';
import {
    APPOINTMENT_ORIGINS,
    APPOINTMENT_STATUSES,
    REMINDER_CHANNELS,
    REMINDER_STATUSES,
} from '@/types/stats';
import { GRACE_REASONS, SUBSCRIPTION_STATUSES } from '@/types/subscription';
import { describe, expect, it } from 'vitest';
import {
    ACTIVITY_KIND_LABELS,
    APPOINTMENT_ORIGIN_LABELS,
    APPOINTMENT_STATUS_LABELS,
    AUDIT_ACTION_LABELS,
    AUDIT_SUBJECT_LABELS,
    GRACE_REASON_LABELS,
    MEMBERSHIP_ROLE_LABELS,
    MEMBERSHIP_STATUS_LABELS,
    REMINDER_CHANNEL_LABELS,
    REMINDER_STATUS_LABELS,
    SUBSCRIPTION_STATUS_LABELS,
} from './labels';

// The `Record<Union, string>` types already fail `tsc` on a missing key;
// this guards the runtime side (no empty label, no stray extra key).
const CASES: Array<[string, readonly string[], Record<string, string>]> = [
    ['subscription status', SUBSCRIPTION_STATUSES, SUBSCRIPTION_STATUS_LABELS],
    ['grace reason', GRACE_REASONS, GRACE_REASON_LABELS],
    ['membership role', MEMBERSHIP_ROLES, MEMBERSHIP_ROLE_LABELS],
    ['membership status', MEMBERSHIP_STATUSES, MEMBERSHIP_STATUS_LABELS],
    ['appointment status', APPOINTMENT_STATUSES, APPOINTMENT_STATUS_LABELS],
    ['appointment origin', APPOINTMENT_ORIGINS, APPOINTMENT_ORIGIN_LABELS],
    ['reminder status', REMINDER_STATUSES, REMINDER_STATUS_LABELS],
    ['reminder channel', REMINDER_CHANNELS, REMINDER_CHANNEL_LABELS],
    ['audit action', AUDIT_ACTIONS, AUDIT_ACTION_LABELS],
    ['audit subject', AUDIT_SUBJECT_TYPES, AUDIT_SUBJECT_LABELS],
    ['activity kind', ACTIVITY_KINDS, ACTIVITY_KIND_LABELS],
];

describe('Spanish label maps', () => {
    it.each(CASES)(
        'labels every %s value, and nothing else',
        (_, values, labels) => {
            expect(Object.keys(labels).sort()).toEqual([...values].sort());
            for (const value of values) {
                expect(labels[value]?.trim().length).toBeGreaterThan(0);
            }
        },
    );

    it('uses the audit action copy from the contract', () => {
        expect(AUDIT_ACTION_LABELS['organizations.suspend']).toBe(
            'Suspendió una organización',
        );
        expect(AUDIT_ACTION_LABELS['subscriptions.extend_grace']).toBe(
            'Extendió un período de gracia',
        );
    });
});
