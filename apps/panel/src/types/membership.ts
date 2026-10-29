import type { CatalogSpecialty } from './professional';

export type MembershipRole = 'owner' | 'admin' | 'professional' | 'staff';

export type MembershipStatus = 'active' | 'inactive' | 'suspended';

export type Membership = {
    id: number;
    user: {
        id: number;
        name: string | null;
        email: string | null;
    };
    roles: MembershipRole[];
    status: MembershipStatus;
    slug: string | null;
    // Only the list (`GET /memberships`) carries them, for the member cards.
    specialties?: CatalogSpecialty[];
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
};
