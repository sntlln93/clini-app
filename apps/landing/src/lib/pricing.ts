// The proposed plans (#237). Prices are in ARS, the annual one with a 40%
// discount (#240). None of this is enforced by the API yet.
export type Billing = 'monthly' | 'annual';

export const ANNUAL_DISCOUNT = 0.4;
export const CONSULTORIO_MONTHLY = 15_000;

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
