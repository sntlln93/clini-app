// Consultorio's reference prices in ARS, the ones the API charges since
// #237 (`config/plans.php`): the base covers 5 professionals and each one
// past them adds the extra amount. Annual billing with a 40% discount is
// still a proposal (#240).
export type Billing = 'monthly' | 'annual';

export const ANNUAL_DISCOUNT = 0.4;
export const CONSULTORIO_MONTHLY = 15_000;
export const CONSULTORIO_INCLUDED_PROFESSIONALS = 5;
export const CONSULTORIO_EXTRA_PROFESSIONAL = 5_000;

const ars = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
});

export function formatArs(amount: number): string {
    return ars.format(amount).replace(/\s/g, '');
}

export function monthlyPrice(base: number, billing: Billing): number {
    return billing === 'annual'
        ? Math.round(base * (1 - ANNUAL_DISCOUNT))
        : base;
}

export function annualTotal(base: number): number {
    return monthlyPrice(base, 'annual') * 12;
}

export function annualSavings(base: number): number {
    return base * 12 - annualTotal(base);
}
