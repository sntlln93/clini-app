import { Separator } from '@/components/ui/separator';
import type { OrganizationSettings } from '../-hooks/load-organization-settings';
import { AcceptedInsuranceProvidersSection } from './AcceptedInsuranceProvidersSection';
import { BookingBrandingSection } from './BookingBrandingSection';

/** Owner and admin (`organization.manage`): how the booking page looks and what it asks. */
export function OrganizationBookingSettings({
    settings,
}: {
    settings: OrganizationSettings;
}) {
    return (
        <>
            <Separator />
            <BookingBrandingSection logo={settings.organizationLogo} />
            <Separator />
            <AcceptedInsuranceProvidersSection
                insuranceProviders={settings.insuranceProviders.catalog}
                accepted={settings.insuranceProviders.accepted}
            />
        </>
    );
}
