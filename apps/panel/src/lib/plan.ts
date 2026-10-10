import { api } from '@/lib/api';
import { mapToAppError } from '@/lib/api-errors';
import { useSubscription } from '@/lib/subscription';
import type { Plan, PlanFeature, PlanId } from '@/types/plan';
import type { QueryKey } from '@tanstack/react-query';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';

export const planQueryOptions = queryOptions({
    queryKey: ['plan'],
    queryFn: () =>
        api.get<{ data: Plan }>('/plan').then((response) => response.data.data),
    staleTime: 5 * 60 * 1000,
});

/**
 * Observes the plan the `_auth` loader already read into the cache (ADR
 * 0007), like `useSubscription`. `undefined` (not loaded) reads as every
 * function included: the backend stays the source of truth.
 */
export function usePlan(): Plan | undefined {
    const { data } = useQuery({ ...planQueryOptions, enabled: false });

    return data;
}

export function planIncludes(
    plan: Plan | undefined,
    feature: PlanFeature,
): boolean {
    return plan?.features[feature] ?? true;
}

export function usePlanIncludes(feature: PlanFeature): boolean {
    return planIncludes(usePlan(), feature);
}

/**
 * What a change to the agenda refreshes besides the page: the plan too when
 * it counts the month's appointments (#238), so the banner stays current.
 */
export function useAppointmentChangeQueryKeys(): QueryKey[] {
    const plan = usePlan();

    return plan && plan.appointment_limit !== null
        ? [['appointments'], planQueryOptions.queryKey]
        : [['appointments']];
}

/**
 * A 409 for a full month means the cached count is behind (bookings from
 * elsewhere): refetches the plan so the banner catches up. No-op for any
 * other error.
 */
export function useRefreshPlanOnFullMonth(): (error: unknown) => Promise<void> {
    const queryClient = useQueryClient();

    return async (error) => {
        const appError = mapToAppError(error);

        if (
            appError.kind === 'business' &&
            appError.code === 'plans.appointment_limit_reached'
        ) {
            await queryClient.invalidateQueries({
                queryKey: planQueryOptions.queryKey,
                refetchType: 'all',
            });
        }
    };
}

/** Why the read-only modules are read-only, so the copy can name the fix: pay (`subscription`) or change plan / deactivate professionals (`plan`). */
export type WritesRestriction = 'subscription' | 'plan';

export function useWritesRestriction(): WritesRestriction | null {
    const subscription = useSubscription();
    const plan = usePlan();

    if (subscription?.restricted) {
        return 'subscription';
    }

    return plan?.restricted ? 'plan' : null;
}

/**
 * Whether the write affordances of the read-only modules (agenda, clinical
 * notes, prescriptions, availability) must be hidden: an expired
 * subscription, or more active professionals than the plan allows.
 */
export function useWritesRestricted(): boolean {
    return useWritesRestriction() !== null;
}

export const PLAN_LABELS: Record<PlanId, string> = {
    free: 'Gratis',
    practice: 'Consultorio',
    center: 'Centro',
};

/** Practice's monthly price for `activeProfessionals`, the API's own formula: base plus each one past the included. */
export function practiceMonthlyAmount(
    pricing: Plan['practice_pricing'],
    activeProfessionals: number,
): number {
    const extra = Math.max(
        0,
        activeProfessionals - pricing.included_professionals,
    );

    return pricing.base_amount + extra * pricing.extra_professional_amount;
}
