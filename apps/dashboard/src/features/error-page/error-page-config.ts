import { brand } from '@clini/brand';
import { LayoutDashboard } from 'lucide-react';
import type { ErrorPageVariant } from './error-page-variant';

// The one file of this feature that differs from the panel's copy: the copy,
// the way home and the way to ask for help are the dashboard's own.

export { useLogout } from '@/features/operator-menu/use-logout';

export const HOME_ACTION = {
    to: '/',
    label: 'Ir al resumen',
    icon: LayoutDashboard,
} as const;

/** Operators are the Clini team: there's no one else to write to. */
export const HELP_URL: string | null = null;

export const OFFLINE_NOTE =
    'El panel de operación vuelve a estar disponible cuando te reconectes.';

export const ERROR_PAGE_COPY: Record<
    ErrorPageVariant,
    { title: string; description: string }
> = {
    bad_request: {
        title: 'No pudimos procesar tu solicitud',
        description:
            'El enlace o la información enviada no son válidos. Volvé a intentarlo desde el resumen.',
    },
    unauthorized: {
        title: 'Volvé a iniciar sesión',
        description:
            'Para continuar, necesitás iniciar sesión. Ingresá a tu cuenta para acceder al panel de operación.',
    },
    forbidden: {
        title: 'No tenés acceso a esta página',
        description:
            'Tu cuenta no tiene permiso para ver este contenido del panel de operación.',
    },
    not_found: {
        title: 'No encontramos esta página',
        description:
            'Puede que el enlace haya cambiado o ya no exista. Volvé al resumen para seguir.',
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
