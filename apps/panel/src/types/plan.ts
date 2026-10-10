export type PlanId = 'free' | 'practice' | 'center';

export type PlanFeature =
    'team' | 'waiting_room' | 'prescriptions' | 'professional_booking_links';

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
    practice_pricing: {
        base_amount: number;
        included_professionals: number;
        extra_professional_amount: number;
        currency: string;
    };
};
