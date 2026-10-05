import { contactUrl, registerUrl } from '@/lib/links';
import { CONSULTORIO_MONTHLY, type Billing } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { Check, Minus } from 'lucide-react';
import { CtaLink } from './CtaLink';
import { PlanPrice } from './PlanPrice';
import type { Plan } from './plans';

type PlanCardProps = { plan: Plan; billing: Billing };

function cta(plan: Plan): { href: string; label: string } {
    if (plan.id === 'consultorio') {
        return { href: registerUrl, label: 'Elegir Consultorio' };
    }
    if (plan.id === 'centro' && contactUrl) {
        return { href: contactUrl, label: 'Coordinar una llamada' };
    }
    return { href: registerUrl, label: 'Empezar gratis' };
}

export function PlanCard({ plan, billing }: PlanCardProps) {
    const featured = plan.id === 'consultorio';
    const action = cta(plan);

    return (
        <article
            aria-labelledby={`plan-${plan.id}`}
            className={cn(
                'flex min-w-0 flex-col gap-5 rounded-3xl border p-7 shadow-card',
                featured
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card',
            )}
        >
            <div className="grid content-start gap-2 lg:min-h-30">
                <span
                    className={cn(
                        'justify-self-start rounded-full px-2.5 py-0.5 text-xs',
                        featured
                            ? 'bg-primary-foreground text-primary'
                            : 'border border-success text-success',
                    )}
                >
                    {plan.badge}
                </span>
                <h3 id={`plan-${plan.id}`} className="text-2xl font-medium">
                    {plan.name}
                </h3>
                <p
                    className={cn(
                        'text-sm',
                        featured ? 'opacity-85' : 'text-muted-foreground',
                    )}
                >
                    {plan.audience}
                </p>
            </div>
            <PlanPrice
                planId={plan.id}
                billing={billing}
                base={CONSULTORIO_MONTHLY}
                featured={featured}
            />
            <hr
                className={cn(
                    'border-t',
                    featured && 'border-primary-foreground/25',
                )}
            />
            <ul className="grid list-none gap-2.5 p-0 text-sm">
                {plan.features.map((feature) => (
                    <li
                        key={feature.label}
                        className={cn(
                            'flex gap-2.5',
                            !feature.included && 'text-muted-foreground',
                        )}
                    >
                        <span
                            className={cn(
                                'mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full',
                                !feature.included && 'border',
                                feature.included &&
                                    (featured
                                        ? 'bg-primary-foreground text-primary'
                                        : 'bg-success-wash text-success'),
                            )}
                        >
                            {feature.included ? (
                                <Check aria-hidden="true" className="size-3" />
                            ) : (
                                <Minus aria-hidden="true" className="size-3" />
                            )}
                        </span>
                        <span>
                            {!feature.included && (
                                <span className="sr-only">No incluye: </span>
                            )}
                            {feature.label}
                        </span>
                    </li>
                ))}
            </ul>
            <CtaLink
                href={action.href}
                variant={featured ? 'default' : 'outline'}
                className={cn(
                    'mt-auto w-full',
                    featured &&
                        'bg-primary-foreground text-primary hover:bg-primary-foreground/90',
                )}
            >
                {action.label}
            </CtaLink>
        </article>
    );
}
