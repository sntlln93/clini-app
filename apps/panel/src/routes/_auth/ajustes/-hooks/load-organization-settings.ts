import { insuranceProvidersQueryOptions } from '@/features/patient-form/use-insurance-providers';
import type { OrganizationLogo } from '@/types/organization';
import type { InsuranceProvider } from '@/types/patient';
import type { QueryClient } from '@tanstack/react-query';
import { acceptedInsuranceProvidersQueryOptions } from './use-accepted-insurance-providers';
import { organizationLogoQueryOptions } from './use-organization-logo';

export type OrganizationSettings = {
    organizationLogo: OrganizationLogo;
    insuranceProviders: {
        catalog: InsuranceProvider[];
        accepted: InsuranceProvider[];
    };
};

/** Owner and admin only (`organization.manage`): the booking page's logo (#239) and insurance providers (#291). */
export async function loadOrganizationSettings(
    queryClient: QueryClient,
): Promise<OrganizationSettings> {
    const [organizationLogo, catalog, accepted] = await Promise.all([
        queryClient.ensureQueryData(organizationLogoQueryOptions),
        queryClient.ensureQueryData(insuranceProvidersQueryOptions()),
        queryClient.ensureQueryData(acceptedInsuranceProvidersQueryOptions),
    ]);

    return { organizationLogo, insuranceProviders: { catalog, accepted } };
}
