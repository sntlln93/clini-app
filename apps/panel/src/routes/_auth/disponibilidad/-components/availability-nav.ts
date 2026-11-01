import type { SecondaryNav } from '@/features/panel-nav/secondary-nav';

// The sub-pages of Disponibilidad, in the secondary navigation. The
// selected professional (`?membershipId=`) carries over between them.
export const availabilityNav: SecondaryNav = {
    label: 'Secciones de Disponibilidad',
    items: [
        { label: 'Semana habitual', to: '/disponibilidad', exact: true },
        { label: 'Excepciones', to: '/disponibilidad/excepciones' },
    ],
};
