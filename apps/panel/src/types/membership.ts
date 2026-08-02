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
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
};
