/** `GET /admin/me`, `POST /admin/login` (contract §3.1). */
export type PlatformAdmin = {
    id: number;
    name: string;
    email: string;
    last_login_at: string | null;
};

/** Embedded operator reference; also `GET /admin/platform-admins` items. */
export type AdminRef = { id: number; name: string; email: string };

export type OrganizationRef = {
    id: number;
    name: string;
    slug: string;
    suspended_at: string | null;
};

export type UserRef = { id: number; name: string; email: string };

export const MEMBERSHIP_ROLES = [
    'owner',
    'admin',
    'professional',
    'staff',
] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const MEMBERSHIP_STATUSES = ['active', 'inactive', 'suspended'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];
