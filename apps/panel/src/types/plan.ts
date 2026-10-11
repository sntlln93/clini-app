export type PlanId = 'free' | 'practice' | 'center';

export type PlanFeature =
    | 'team'
    | 'waiting_room'
    | 'prescriptions'
    | 'professional_booking_links'
    | 'booking_branding'
    | 'reports';

/** GET /plan's `data` (#237). */
export type Plan = {
    plan: PlanId;
    /** Center, assigned by the Clini team: billed outside the panel. */
    assigned_by_platform: boolean;
    features: Record<PlanFeature, boolean>;
    /** Active professionals the plan allows; null for no limit. */
    professional_limit: number | null;
    active_professionals: number;
    /** More active professionals than the limit: the agenda is read-only. */
    restricted: boolean;
    /** Appointments per calendar month the plan allows (#238); null for no limit. */
    appointment_limit: number | null;
    /** The month's count from which the panel warns; null for no limit. */
    appointment_warning_threshold: number | null;
    /** Current month, in the organization's timezone, without cancelled or rescheduled ones. */
    appointments_this_month: number;
    practice_pricing: {
        base_amount: number;
        included_professionals: number;
        extra_professional_amount: number;
        currency: string;
    };
};
