import type { AdminRef } from './admin';

export const AUDIT_ACTIONS = [
    'auth.login',
    'auth.logout',
    'organizations.suspend',
    'organizations.reactivate',
    'users.verify_email',
    'users.block',
    'users.unblock',
    'subscriptions.extend_grace',
] as const;
export type AdminAuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_SUBJECT_TYPES = [
    'organization',
    'user',
    'subscription',
] as const;
export type AuditSubjectType = (typeof AUDIT_SUBJECT_TYPES)[number];

/** Contract §3.9. */
export type AdminAuditLog = {
    id: number;
    action: AdminAuditAction;
    platform_admin: AdminRef;
    subject: {
        type: AuditSubjectType;
        id: number;
        label: string | null;
    } | null;
    metadata: Record<string, unknown>;
    ip: string | null;
    created_at: string;
};
