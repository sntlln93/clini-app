import type {
    MembershipRole,
    MembershipStatus,
    OrganizationRef,
} from './admin';

/** Contract §3.5 — list item. */
export type AdminUser = {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    blocked_at: string | null;
    block_reason: string | null;
    created_at: string;
    memberships_count: number;
};

export type UserMembership = {
    id: number;
    organization: OrganizationRef;
    roles: MembershipRole[];
    status: MembershipStatus;
    created_at: string;
};

export type AdminUserDetail = AdminUser & { memberships: UserMembership[] };
