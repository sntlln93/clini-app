import type { AdminRef } from './admin';
import type { OrganizationPlan } from './organization';

export const CONTACT_REQUEST_STATUSES = [
    'new',
    'in_progress',
    'closed',
] as const;
export type ContactRequestStatus = (typeof CONTACT_REQUEST_STATUSES)[number];

/** A request from the landing's contact form (#248). */
export type AdminContactRequest = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    organization_name: string | null;
    team_size: number | null;
    /** The plan the visitor asked about; null = not said. */
    plan: OrganizationPlan | null;
    message: string;
    status: ContactRequestStatus;
    /** The operator who last changed the status. */
    handled_by: AdminRef | null;
    closed_at: string | null;
    created_at: string;
    updated_at: string;
};
