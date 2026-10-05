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
            yes('Hasta 40 turnos por mes'),
            yes('Reserva online con tu link'),
            yes('Recordatorios por mail'),
            yes('Notas clínicas por visita'),
            no('Recepción y equipo'),
            no('Recetas'),
        ],
    },
    {
        id: 'consultorio',
        badge: 'Para la mayoría de los consultorios',
        name: 'Consultorio',
        audience:
            'Compartís el consultorio, tenés recepción o ya no te alcanzan 40 turnos.',
        features: [
            yes('Hasta 5 profesionales'),
            yes('Turnos sin límite'),
            yes('Equipo con roles: administración, profesionales y recepción'),
            yes('Sala de espera en vivo'),
            yes('Recetas listas para imprimir'),
            yes('Un link de reservas para cada profesional'),
            yes('Página de reservas con tu marca, sin «Hecho con Clini»'),
        ],
    },
    {
        id: 'centro',
        badge: 'Centro médico',
        name: 'Centro',
        audience: 'Son más de 5 profesionales, o atienden en más de una sede.',
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
            yes('Factura A'),
        ],
    },
];

type CompareRow = { label: string; values: [string, string, string] };
export type CompareGroup = { title: string; rows: CompareRow[] };

export const COMPARE: CompareGroup[] = [
    {
        title: 'Agenda y reservas',
        rows: [
            { label: 'Profesionales', values: ['1', 'Hasta 5', 'Sin límite'] },
            {
                label: 'Turnos por mes',
                values: ['40', 'Sin límite', 'Sin límite'],
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
            { label: 'Recetas para imprimir', values: ['No', 'Sí', 'Sí'] },
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
