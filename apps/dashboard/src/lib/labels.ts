import type { StatusTone } from '@/components/StatusPill';
import type { MembershipRole, MembershipStatus } from '@/types/admin';
import type { AdminAuditAction, AuditSubjectType } from '@/types/audit';
import type { ActivityKind } from '@/types/overview';
import type {
    AppointmentOrigin,
    AppointmentStatus,
    ReminderChannel,
    ReminderStatus,
} from '@/types/stats';
import type { GraceReason, SubscriptionStatus } from '@/types/subscription';

// Exhaustive `Record`s: a new backend enum value fails `tsc` until it gets
// its Spanish label (and `labels.test.ts` checks it at runtime too).

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
    pending: 'Pendiente',
    active: 'Activa',
    grace: 'En gracia',
    expired: 'Vencida',
    cancelled: 'Cancelada',
};

export const GRACE_REASON_LABELS: Record<GraceReason, string> = {
    payment_failed: 'Pago rechazado',
    paused: 'Pausada en Mercado Pago',
};

export const MEMBERSHIP_ROLE_LABELS: Record<MembershipRole, string> = {
    owner: 'Propietario',
    admin: 'Administrador',
    professional: 'Profesional',
    staff: 'Personal',
};

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    suspended: 'Suspendido',
};

// Same tones as the panel's members table: green active, gray inactive,
// amber suspended.
export const MEMBERSHIP_STATUS_TONES: Record<MembershipStatus, StatusTone> = {
    active: 'success',
    inactive: 'neutral',
    suspended: 'warning',
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
    scheduled: 'Agendado',
    confirmed: 'Confirmado',
    arrived: 'Llegó',
    completed: 'Completado',
    no_show: 'Ausente',
    cancelled: 'Cancelado',
    rescheduled: 'Reprogramado',
};

export const APPOINTMENT_ORIGIN_LABELS: Record<AppointmentOrigin, string> = {
    online: 'Online',
    manual: 'Manual',
};

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
    pending: 'Pendientes',
    queued: 'En cola',
    sent: 'Enviados',
    failed: 'Fallidos',
};

export const REMINDER_CHANNEL_LABELS: Record<ReminderChannel, string> = {
    email: 'Correo',
    sms: 'SMS',
    whatsapp: 'WhatsApp',
};

export const AUDIT_ACTION_LABELS: Record<AdminAuditAction, string> = {
    'auth.login': 'Inició sesión',
    'auth.logout': 'Cerró sesión',
    'organizations.suspend': 'Suspendió una organización',
    'organizations.reactivate': 'Reactivó una organización',
    'users.verify_email': 'Verificó un correo',
    'users.block': 'Bloqueó un usuario',
    'users.unblock': 'Desbloqueó un usuario',
    'subscriptions.extend_grace': 'Extendió un período de gracia',
};

export const AUDIT_SUBJECT_LABELS: Record<AuditSubjectType, string> = {
    organization: 'Organización',
    user: 'Usuario',
    subscription: 'Suscripción',
};

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
    organization_created: 'Nueva organización',
    user_registered: 'Nuevo usuario',
    subscription_event: 'Evento de suscripción',
};
