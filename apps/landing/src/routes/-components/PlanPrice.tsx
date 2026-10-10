import {
    annualSavings,
    annualTotal,
    CONSULTORIO_EXTRA_PROFESSIONAL,
    CONSULTORIO_INCLUDED_PROFESSIONALS,
    formatArs,
    monthlyPrice,
    type Billing,
} from '@/lib/pricing';
import { cn } from '@/lib/utils';
import type { PlanId } from './plans';

type PlanPriceProps = {
    planId: PlanId;
    billing: Billing;
    base: number;
    featured: boolean;
};

function note(planId: PlanId, billing: Billing, base: number): string {
    if (planId === 'free') {
        return 'Sin tarjeta. Creás la cuenta y compartís tu link el mismo día.';
    }
    if (planId === 'centro') {
        return billing === 'annual'
            ? 'Según profesionales y sedes, con el mismo 40% de descuento pagando el año.'
            : 'Según profesionales y sedes. Te pasamos el precio en una llamada de 20 minutos.';
    }
    return billing === 'annual'
        ? `Un pago de ${formatArs(annualTotal(base))} por año. Ahorrás ${formatArs(annualSavings(base))}.`
        : `Incluye ${CONSULTORIO_INCLUDED_PROFESSIONALS} profesionales. Cada profesional adicional suma ${formatArs(CONSULTORIO_EXTRA_PROFESSIONAL)} por mes.`;
}

export function PlanPrice({ planId, billing, base, featured }: PlanPriceProps) {
    const muted = featured ? 'opacity-85' : 'text-muted-foreground';

    return (
        <div>
            <p className="flex flex-wrap items-baseline gap-2 text-[clamp(2.3rem,4vw,3rem)] leading-none tracking-tight tabular-nums">
                {planId === 'free' && (
                    <>
                        $0{' '}
                        <small className={cn('text-sm tracking-normal', muted)}>
                            para siempre
                        </small>
                    </>
                )}
                {planId === 'consultorio' && (
                    <>
                        {billing === 'annual' && (
                            <s className={cn('text-sm tracking-normal', muted)}>
                                {formatArs(base)}
                            </s>
                        )}
                        {formatArs(monthlyPrice(base, billing))}
                        <small className={cn('text-sm tracking-normal', muted)}>
                            ARS / mes
                        </small>
                    </>
                )}
                {planId === 'centro' && 'A medida'}
            </p>
            <p
                aria-live="polite"
                className={cn('mt-2 min-h-[2.6em] text-xs', muted)}
            >
                {note(planId, billing, base)}
            </p>
        </div>
    );
}
