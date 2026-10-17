import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { practiceAmount } from '@/lib/plan';
import { formatPesos } from '@/lib/price';
import type { Plan } from '@/types/plan';
import type { SubscriptionBilling } from '@/types/subscription';
import { useId } from 'react';

type BillingChoiceProps = {
    plan: Plan;
    value: SubscriptionBilling;
    onValueChange: (billing: SubscriptionBilling) => void;
    disabled?: boolean;
};

type Option = { value: SubscriptionBilling; title: string; detail: string };

function options(plan: Plan): Option[] {
    const pricing = plan.practice_pricing;
    const monthly = practiceAmount(
        pricing,
        plan.active_professionals,
        'monthly',
    );
    const annual = practiceAmount(pricing, plan.active_professionals, 'annual');
    const savings = monthly * 12 - annual;
    const discount = pricing.annual_discount_percent;

    return [
        {
            value: 'monthly',
            title: 'Mensual',
            detail: `${formatPesos(monthly)} por mes, con débito automático.`,
        },
        {
            value: 'annual',
            title:
                discount > 0 ? `Anual, con ${discount}% de descuento` : 'Anual',
            detail:
                savings > 0
                    ? `Un pago de ${formatPesos(annual)} por año (${formatPesos(annual / 12)} por mes). Ahorrás ${formatPesos(savings)}.`
                    : `Un pago de ${formatPesos(annual)} por año.`,
        },
    ];
}

/**
 * How the new Consultorio subscription is paid (#240), priced for the
 * current active professionals. Only offered when the checkout creates a
 * new Mercado Pago subscription, whose frequency can't change afterwards.
 */
export function BillingChoice({
    plan,
    value,
    onValueChange,
    disabled = false,
}: BillingChoiceProps) {
    const idPrefix = useId();

    return (
        <div className="space-y-2">
            <p id={`${idPrefix}-label`} className="text-sm font-medium">
                Forma de pago
            </p>
            <RadioGroup
                aria-labelledby={`${idPrefix}-label`}
                value={value}
                onValueChange={(next) =>
                    onValueChange(next as SubscriptionBilling)
                }
                disabled={disabled}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
                {options(plan).map((option) => (
                    <label
                        key={option.value}
                        htmlFor={`${idPrefix}-${option.value}`}
                        className="flex items-start gap-2 rounded-md border p-3 text-sm has-data-checked:border-primary"
                    >
                        <RadioGroupItem
                            id={`${idPrefix}-${option.value}`}
                            value={option.value}
                            className="mt-0.5"
                        />
                        <span className="space-y-0.5">
                            <span className="block font-medium">
                                {option.title}
                            </span>
                            <span className="block text-muted-foreground">
                                {option.detail}
                            </span>
                        </span>
                    </label>
                ))}
            </RadioGroup>
        </div>
    );
}
