import { Indented } from '@/components/Section';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { Billing } from '@/lib/pricing';
import { useState } from 'react';
import { CompareTable } from './CompareTable';
import { PlanCard } from './PlanCard';
import { PLANS } from './plans';
import { PricingNotes } from './PricingNotes';

const BILLING_OPTIONS: { value: Billing; label: string }[] = [
    { value: 'monthly', label: 'Mensual' },
    { value: 'annual', label: 'Anual' },
];

export function PricingSection() {
    const [billing, setBilling] = useState<Billing>('monthly');

    return (
        <section id="precio" aria-labelledby="precio-title" className="py-16">
            <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-[7.5rem_1fr] md:gap-8">
                <span className="text-muted-foreground">Planes</span>
                <div>
                    <h2
                        id="precio-title"
                        className="max-w-[20ch] text-3xl leading-tight tracking-tight md:text-[2.75rem]"
                    >
                        Empezás gratis. Pagás cuando el consultorio crece.
                    </h2>
                    <p className="mt-4 max-w-[58ch] text-xl leading-snug font-light text-muted-foreground">
                        Un precio por consultorio, en pesos, sin costo extra por
                        cada profesional. Cambiás de plan cuando quieras y no
                        perdés nada de lo que cargaste.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <SegmentedControl
                            label="Forma de pago"
                            options={BILLING_OPTIONS}
                            value={billing}
                            onChange={setBilling}
                        />
                        <span className="rounded-full bg-success-wash px-3 py-1.5 text-xs">
                            <b className="mr-1 font-semibold text-success">
                                40% OFF
                            </b>
                            pagando el año completo
                        </span>
                    </div>
                </div>
            </div>
            <Indented>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {PLANS.map((plan) => (
                        <PlanCard key={plan.id} plan={plan} billing={billing} />
                    ))}
                </div>
                <CompareTable />
                <PricingNotes billing={billing} />
            </Indented>
        </section>
    );
}
