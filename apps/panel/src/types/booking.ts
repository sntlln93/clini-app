import type { DocumentType, InsuranceProvider } from './patient';

export type BookingOrganization = {
    name: string;
    slug: string;
    timezone: string;
    /** Free plan: the page shows «Hecho con Clini» (#239). */
    show_clini_mark: boolean;
    /** Only on a plan with booking branding, and only once uploaded. */
    logo_url: string | null;
};

export type BookingSpecialty = {
    id: number;
    name: string;
};

export type BookingService = {
    id: number;
    name: string | null;
    duration_minutes: number;
    /** Optional per professional: `null` when the practice set no price. */
    price_cents: number | null;
    currency: string;
};

export type BookingProfessional = {
    membership_id: number;
    name: string | null;
    specialties: BookingSpecialty[];
    services: BookingService[];
};

export type BookingOrganizationResponse = {
    organization: BookingOrganization;
    professionals: BookingProfessional[];
    preselected_membership_id: number | null;
    /** The ones the practice accepts (#291); empty means the page doesn't ask. */
    insurance_providers: InsuranceProvider[];
};

export type AvailableSlot = {
    start_at: string;
    end_at: string;
};

export type BookingPatientPayload = {
    name: string;
    document_type: DocumentType | '';
    document_number: string;
    email: string;
    phone: string;
    insurance_provider_id: number | null;
    insurance_member_number: string;
};

export type OnlineBookingPayload = {
    membershipId: number;
    serviceId: number;
    startAt: string;
    patient: BookingPatientPayload;
};

export type BookingConfirmation = {
    start_at: string;
    end_at: string;
    professional_name: string | null;
    service_name: string | null;
    organization_name: string;
    /** The practice's primary address on one line, for the calendar event (#295); null without one. */
    organization_address: string | null;
    /** Opaque, and the same the reminder's `.ics` carries, so importing both keeps one event. */
    calendar_uid: string;
};
