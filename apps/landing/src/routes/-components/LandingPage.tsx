import { ClosingSection } from './ClosingSection';
import { DaySection } from './DaySection';
import { FaqSection } from './FaqSection';
import { Hero } from './Hero';
import { OneClockSection } from './OneClockSection';
import { PricingSection } from './PricingSection';
import { RolesSection } from './RolesSection';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

export function LandingPage() {
    return (
        <div className="mx-auto max-w-295 px-4 sm:px-6 lg:px-12">
            <SiteHeader />
            <main id="top">
                <Hero />
                <DaySection />
                <OneClockSection />
                <RolesSection />
                <PricingSection />
                <FaqSection />
                <ClosingSection />
            </main>
            <SiteFooter />
        </div>
    );
}
