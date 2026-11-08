import type { SecondaryNav } from '@/features/panel-nav/secondary-nav';

// The tabs of Ajustes, in the secondary navigation. Each tab's route guards
// the same rule in its loader, so a hidden tab's URL leads back to Ajustes.
export const settingsNav: SecondaryNav = {
    label: 'Secciones de Ajustes',
    items: [
        { label: 'Apariencia', to: '/ajustes/apariencia' },
        { label: 'Seguridad', to: '/ajustes/seguridad' },
        {
            label: 'Plan y suscripción',
            to: '/ajustes/suscripcion',
            requiresMembership: true,
        },
        {
            label: 'Consultorio',
            to: '/ajustes/consultorio',
            requiresMembership: true,
            permissions: ['organization.manage'],
        },
        {
            label: 'Reservas',
            to: '/ajustes/reservas',
            requiresMembership: true,
        },
        {
            label: 'Matrículas',
            to: '/ajustes/matriculas',
            // Whoever attends here holds licenses (#380), and whoever can
            // turn that on for themselves starts here (#286, #387).
            roles: ['professional'],
            permissions: ['memberships.manage'],
        },
        {
            label: 'Profesionales',
            to: '/ajustes/profesionales',
            permissions: ['memberships.view'],
        },
        { label: 'Protección de datos', to: '/ajustes/proteccion-de-datos' },
    ],
};
