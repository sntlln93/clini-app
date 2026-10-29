export type PlanFeature = { label: string; included: boolean };

export type PlanId = 'free' | 'consultorio' | 'centro';

export type Plan = {
    id: PlanId;
    badge: string;
    name: string;
    audience: string;
    features: PlanFeature[];
};

const yes = (label: string): PlanFeature => ({ label, included: true });
const no = (label: string): PlanFeature => ({ label, included: false });

export const PLANS: Plan[] = [
    {
        id: 'free',
        badge: 'Independiente',
        name: 'Gratis',
        audience:
            'Atendés solo y querés dejar de coordinar turnos por WhatsApp.',
        features: [
            yes('1 profesional'),
            yes('Turnos sin límite'),
            yes('Reserva online con tu link'),
            yes('Recordatorios por mail'),
            yes('Notas clínicas por visita'),
            no('Recepción y equipo'),
            no('Registro de la medicación indicada'),
        ],
    },
    {
        id: 'consultorio',
        badge: 'Para la mayoría de los consultorios',
        name: 'Consultorio',
        audience: 'Compartís el consultorio o tenés recepción.',
        features: [
            yes('5 profesionales incluidos, sin tope'),
            yes('Turnos sin límite'),
            yes('Equipo con roles: administración, profesionales y recepción'),
            yes('Sala de espera en vivo'),
            yes('Registro de la medicación indicada'),
            yes('Un link de reservas para cada profesional'),
            yes('Página de reservas con tu marca, sin «Hecho con Clini»'),
        ],
    },
    {
        id: 'centro',
        badge: 'Centro médico',
        name: 'Centro',
        audience:
            'Atienden en más de una sede, o necesitan dominio propio y un servidor dedicado.',
        features: [
            yes('Todo lo de Consultorio'),
            yes('Profesionales sin límite'),
            yes('Varias sedes en una sola cuenta'),
            yes(
                'Reservas en tu dominio o subdominio, como turnos.tucentro.com.ar',
            ),
            yes('Servidor dedicado para tu centro'),
            yes('Reportes de ocupación y ausentismo por profesional'),
            yes('Migramos tus pacientes y turnos desde tu sistema actual'),
            yes('Capacitación para todo el equipo'),
            yes('Una persona de Clini asignada, también por WhatsApp'),
        ],
    },
];

type CompareRow = { label: string; values: [string, string, string] };
export type CompareGroup = { title: string; rows: CompareRow[] };

export const COMPARE: CompareGroup[] = [
    {
        title: 'Agenda y reservas',
        rows: [
            {
                label: 'Profesionales',
                values: ['1', '5 incluidos, sin tope', 'Sin límite'],
            },
            {
                label: 'Turnos por mes',
                values: ['Sin límite', 'Sin límite', 'Sin límite'],
            },
            { label: 'Reserva online, 24 h', values: ['Sí', 'Sí', 'Sí'] },
            {
                label: 'Link de reservas por profesional',
                values: ['No', 'Sí', 'Sí'],
            },
            {
                label: 'Recordatorios por mail, 12 h antes',
                values: ['Sí', 'Sí', 'Sí'],
            },
            { label: 'Sedes', values: ['1', '1', 'Varias'] },
            {
                label: 'Página de reservas en tu dominio',
                values: ['No', 'No', 'Sí'],
            },
            { label: 'Servidor dedicado', values: ['No', 'No', 'Sí'] },
        ],
    },
    {
        title: 'Consultorio',
        rows: [
            { label: 'Equipo y roles', values: ['No', 'Sí', 'Sí'] },
            { label: 'Sala de espera', values: ['No', 'Sí', 'Sí'] },
            { label: 'Notas clínicas', values: ['Sí', 'Sí', 'Sí'] },
            {
                label: 'Medicación indicada',
                values: ['No', 'Sí', 'Sí'],
            },
            {
                label: 'Reportes de ocupación y ausentismo',
                values: ['No', 'No', 'Sí'],
            },
        ],
    },
    {
        title: 'Acompañamiento',
        rows: [
            {
                label: 'Soporte',
                values: ['Por mail', 'Por mail y WhatsApp', 'Persona asignada'],
            },
            {
                label: 'Migración de datos y capacitación',
                values: ['No', 'No', 'Sí'],
            },
            {
                label: 'Marca Clini en tu página de reservas',
                values: ['Sí', 'No', 'No'],
            },
        ],
    },
];
