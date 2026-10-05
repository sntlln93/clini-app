import type { AppointmentTone } from '@/lib/appointment-status';

// "Un día con Clini": each moment of a practice's day where Clini does one
// job. Every claim here was checked against the code (see #247); keep it
// that way when editing.
export type SlotDetail = {
    heading?: string;
    field?: { label: string; value: string };
    steps?: { label: string; tone?: AppointmentTone; current?: boolean }[];
    rows?: [string, string][];
    legal?: string;
};

export type DaySlot = {
    time: string;
    moment: string;
    title: string;
    body: string;
    detail: SlotDetail;
};

export const DAY_SLOTS: DaySlot[] = [
    {
        time: '09:10',
        moment: 'Suena el teléfono',
        title: 'Recepción carga el turno en segundos',
        body: 'Buscás al paciente por nombre o documento. Si es nuevo para tu consultorio pero ya se atendió en otro que usa Clini, sus datos básicos se completan solos.',
        detail: {
            heading: 'Nuevo paciente',
            field: { label: 'DNI', value: '32.418.907' },
            rows: [['Ya existe en Clini', 'Rosa Villalba']],
        },
    },
    {
        time: '10:05',
        moment: 'Llega el paciente',
        title: 'Sala de espera en vivo',
        body: 'Recepción marca la llegada y cada profesional ve su fila por orden de llegada, con los minutos de espera. Llamás al siguiente sin salir a preguntar.',
        detail: {
            steps: [
                { label: 'Agendado', tone: 'scheduled' },
                { label: 'Confirmado', tone: 'confirmed' },
                { label: 'Llegó', tone: 'arrived', current: true },
                { label: 'Completado', tone: 'completed' },
            ],
            rows: [['Rosa V.', 'esperando 7 min']],
        },
    },
    {
        time: '13:30',
        moment: 'Un imprevisto',
        title: 'Cancelar o mover un turno libera el horario',
        body: 'Cuando cancelás o reprogramás desde la agenda, el hueco vuelve a estar disponible para la reserva online y el recordatorio pendiente se cancela solo.',
        detail: {
            rows: [
                ['Jorge Paz', '11:00 → jue 16/10 · 09:30'],
                ['Martes 11:00', 'Libre otra vez'],
            ],
        },
    },
    {
        time: '18:40',
        moment: 'Última consulta',
        title: 'Notas de la visita y receta, en el mismo turno',
        body: 'Cada nota clínica queda unida a la visita y a quien la escribió. La receta se arma con diagnóstico, medicamento, posología y cantidad, lista para imprimir. Solo la ve el profesional que la emitió.',
        detail: {
            rows: [
                ['Diagnóstico', 'Faringitis aguda'],
                ['Amoxicilina 500 mg', '1 c/8 h · x 21'],
            ],
            legal: 'Documento sin validez como receta electrónica.',
        },
    },
    {
        time: '22:30',
        moment: '12 horas antes',
        title: 'Sale el recordatorio del turno de mañana',
        body: 'Clini le escribe por mail a cada paciente 12 horas antes de su turno, con el día, la hora y el profesional. Cada recordatorio sale una sola vez y queda registrado.',
        detail: {
            rows: [
                ['Para', 'Lucía Gómez'],
                ['Turno', 'Mié 15/10 · 10:30'],
                ['Con', 'Dr. Martín Sosa'],
                ['Canal', 'Correo electrónico'],
            ],
        },
    },
    {
        time: '23:15',
        moment: 'Consultorio cerrado',
        title: 'Alguien reserva desde el sillón',
        body: 'Desde tu link, el paciente elige profesional y prestación (puede filtrar por especialidad) y ve solo horarios realmente libres, hasta 60 días hacia adelante. No necesita crear una cuenta. Si dos personas quieren el último turno al mismo tiempo, se lo queda una sola.',
        detail: {
            steps: [
                { label: 'Profesional y prestación' },
                { label: 'Horario', current: true },
                { label: 'Nombre y DNI' },
            ],
            rows: [['Kinesiología · Sesión', '45 min']],
        },
    },
];
