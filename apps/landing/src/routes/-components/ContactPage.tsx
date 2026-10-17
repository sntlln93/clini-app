import { Indented, Section } from '@/components/Section';
import { ContactForm } from './ContactForm';
import type { PlanId } from './plans';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

export function ContactPage({ plan }: { plan: PlanId | null }) {
    return (
        <div className="mx-auto max-w-295 px-4 sm:px-6 lg:px-12">
            <SiteHeader />
            <main id="top">
                <Section
                    titleAs="h1"
                    eyebrow="Contacto"
                    title="Contanos sobre tu consultorio"
                    lead="Si te interesa el plan Centro o tenés dudas antes de empezar, escribinos. Te respondemos por correo o por teléfono."
                >
                    <Indented>
                        <div className="max-w-180">
                            <ContactForm initialPlan={plan} />
                        </div>
                    </Indented>
                </Section>
            </main>
            <SiteFooter />
        </div>
    );
}
