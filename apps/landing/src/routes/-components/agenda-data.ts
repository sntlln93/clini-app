import type { AppointmentTone } from '@/lib/appointment-status';

// Example data for the hero's agenda. Every name is invented.
export const AGENDA_START = 9 * 60;
export const AGENDA_END = 12 * 60;
export const PX_PER_HALF_HOUR = 72;

export type MockAppointment = {
    patient: string;
    reason: string;
    start: string;
    minutes: number;
    tone: AppointmentTone;
    isNew?: boolean;
};

export type MockProfessional = {
    initials: string;
    name: string;
    specialty: string;
    appointments: MockAppointment[];
};

export const PROFESSIONALS: MockProfessional[] = [
    {
        initials: 'MS',
        name: 'Dr. Martín Sosa',
        specialty: 'Clínica médica',
        appointments: [
            {
                patient: 'Carlos Méndez',
                reason: 'Control',
                start: '09:00',
                minutes: 30,
                tone: 'no_show',
            },
            {
                patient: 'Rosa Villalba',
                reason: 'Primera consulta',
                start: '09:30',
                minutes: 30,
                tone: 'arrived',
            },
            {
                patient: 'Lucía Gómez',
                reason: 'Control',
                start: '10:30',
                minutes: 30,
                tone: 'online',
                isNew: true,
            },
            {
                patient: 'Jorge Paz',
                reason: 'Apto físico',
                start: '11:00',
                minutes: 30,
                tone: 'scheduled',
            },
        ],
    },
    {
        initials: 'PF',
        name: 'Lic. Paula Ferrer',
        specialty: 'Kinesiología',
        appointments: [
            {
                patient: 'Tomás Ríos',
                reason: 'Rehabilitación, 60 min',
                start: '09:00',
                minutes: 60,
                tone: 'completed',
            },
            {
                patient: 'Elena Duarte',
                reason: 'Sesión',
                start: '10:00',
                minutes: 30,
                tone: 'confirmed',
            },
            {
                patient: 'Marcos Ibarra',
                reason: 'Rehabilitación, 60 min',
                start: '11:00',
                minutes: 60,
                tone: 'scheduled',
            },
        ],
    },
    {
        initials: 'IR',
        name: 'Dra. Inés Robles',
        specialty: 'Odontología',
        appointments: [
            {
                patient: 'Sofía Benítez',
                reason: 'Limpieza',
                start: '09:30',
                minutes: 30,
                tone: 'arrived',
            },
            {
                patient: 'Andrés Molina',
                reason: 'Tratamiento de conducto',
                start: '10:00',
                minutes: 45,
                tone: 'confirmed',
            },
            {
                patient: 'Valeria Sanz',
                reason: 'Control',
                start: '11:30',
                minutes: 30,
                tone: 'scheduled',
            },
        ],
    },
];

export const NOW = '09:50';

export function toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

/** Vertical offset in px from the top of the agenda for a time of day. */
export function offsetFor(time: string): number {
    return ((toMinutes(time) - AGENDA_START) / 30) * PX_PER_HALF_HOUR;
}

export function heightFor(minutes: number): number {
    return (minutes / 30) * PX_PER_HALF_HOUR;
}

export const HALF_HOURS = Array.from(
    { length: (AGENDA_END - AGENDA_START) / 30 },
    (_, index) => {
        const total = AGENDA_START + index * 30;
        return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    },
);
