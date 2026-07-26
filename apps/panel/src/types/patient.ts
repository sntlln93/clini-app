export type DocumentType = 'dni' | 'passport' | 'insurance_id';

export type Sex = 'f' | 'm' | 'u';

export type InsuranceProvider = {
    id: number;
    name: string;
};

export type Patient = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    document_type: DocumentType;
    document_number: string;
    sex: Sex | null;
    birth_date: string | null;
    insurance_provider_id: number | null;
    insurance_provider?: InsuranceProvider | null;
    created_at: string;
};

export type PatientPayload = {
    name: string;
    document_type: DocumentType | '';
    document_number: string;
    email: string;
    phone: string;
    sex: Sex | '';
    birth_date: string;
    insurance_provider_id: number | null;
};

export type Paginated<T> = {
    data: T[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
};
