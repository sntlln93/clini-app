/** Roster item from `GET /professionals` — agenda/availability shape, not the membership-management one (`Membership`). */
export type Professional = {
    id: number;
    user: {
        id: number;
        name: string;
        email: string;
    };
};

export type CatalogService = {
    id: number;
    name: string;
};

export type CatalogSpecialty = {
    id: number;
    name: string;
};

export type ProfessionalService = {
    id: number;
    membership_id: number;
    service_id: number;
    service_name: string | null;
    duration_minutes: number;
    price_cents: number | null;
    active: boolean;
};

export type ProfessionalSpecialty = {
    id: number;
    membership_id: number;
    specialty_id: number;
    specialty_name: string | null;
};

export type UserSpecialty = {
    id: number;
    specialty_id: number;
    specialty_name: string | null;
};
