import type { DocumentType } from './patient';

export type BookingOrganization = {
    name: string;
    slug: string;
    timezone: string;
};

export type BookingSpecialty = {
    id: number;
    name: string;
};

export type BookingService = {
    id: number;
    name: string | null;
    duration_minutes: number;
    price_cents: number;
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
};
