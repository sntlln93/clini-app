import { LANDING_URL } from '@/lib/landing';
import { brand } from '@clini/brand';
import { CalendarDays } from 'lucide-react';
import type { ErrorPageVariant } from './error-page-variant';

// The one file of this feature that differs from the dashboard's copy: the
// copy, the way home and the way to ask for help are the panel's own.

export { useLogout } from '@/features/profile-menu/use-logout';

export const HOME_ACTION = {
    to: '/agenda',
    label: 'Ir a la agenda',
    icon: CalendarDays,
} as const;

/** The landing's contact form; without a landing (#249) there's nowhere to send the user. */
export const HELP_URL: string | null = LANDING_URL
    ? `${LANDING_URL}/contacto`
    : null;

export const OFFLINE_NOTE =
    'Tu agenda vuelve a estar disponible cuando te reconectes.';

export const ERROR_PAGE_COPY: Record<
    ErrorPageVariant,
    { title: string; description: string }
> = {
    bad_request: {
        title: 'No pudimos procesar tu solicitud',
        description:
            'El enlace o la información enviada no son válidos. Volvé a intentarlo desde tu agenda.',
    },
    unauthorized: {
        title: 'Volvé a iniciar sesión',
        description:
            'Para continuar, necesitás iniciar sesión. Ingresá a tu cuenta para acceder a tu agenda.',
    },
    forbidden: {
        title: 'No tenés acceso a esta página',
        description:
            'Tu cuenta no tiene permiso para ver este contenido. Si necesitás acceso, consultá con quien administra tu cuenta.',
    },
    not_found: {
        title: 'No encontramos esta página',
        description:
            'Puede que el enlace haya cambiado o ya no exista. Volvé a tu agenda para seguir con tu día.',
    },
    timeout: {
        title: 'La solicitud tardó demasiado',
        description:
            'Se agotó el tiempo para completar tu solicitud. Revisá tu conexión y volvé a intentarlo.',
    },
    session_expired: {
        title: 'Tu sesión venció',
        description:
            'Actualizá la página para continuar. Si te lo pedimos, volvé a iniciar sesión.',
    },
    rate_limited: {
        title: 'Vamos un poco más despacio',
        description:
            'Recibimos varios intentos en poco tiempo. Esperá un momento antes de volver a intentar.',
    },
    server: {
        title: 'Algo no salió como esperábamos',
        description:
            'No pudimos cargar esta página. Probá de nuevo en unos minutos.',
    },
    unavailable: {
        title: `${brand.name} no está disponible por un momento`,
        description:
            'El servicio no está disponible en este momento. Esperá unos minutos y volvé a intentarlo.',
    },
    offline: {
        title: 'Parece que se cortó la conexión',
        description:
            'Revisá tu conexión a internet. Cuando vuelva, podés intentar de nuevo.',
    },
};
