import type { Plan, PlanId } from '@/types/plan';

/** Shared `GET /plan` fixture: features and limit follow the backend's catalog. */
export function buildPlan(plan: PlanId, overrides: Partial<Plan> = {}): Plan {
    const paid = plan !== 'free';
    const professionalLimit = paid ? null : 1;
    const activeProfessionals = overrides.active_professionals ?? 1;

    return {
        plan,
        assigned_by_platform: plan === 'center',
        features: {
            team: paid,
            waiting_room: paid,
            prescriptions: paid,
            professional_booking_links: paid,
        },
        professional_limit: professionalLimit,
        active_professionals: activeProfessionals,
        restricted:
            professionalLimit !== null &&
            activeProfessionals > professionalLimit,
        practice_pricing: {
            base_amount: 15000,
            included_professionals: 5,
            extra_professional_amount: 5000,
            currency: 'ARS',
        },
        ...overrides,
    };
}
