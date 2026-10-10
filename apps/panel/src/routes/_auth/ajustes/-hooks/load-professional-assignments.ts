import type { Membership } from '@/types/membership';
import type {
    ProfessionalService,
    ProfessionalSpecialty,
    UserSpecialty,
} from '@/types/professional';
import type { QueryClient } from '@tanstack/react-query';
import { professionalServicesQueryOptions } from './use-professional-services';
import { professionalSpecialtiesQueryOptions } from './use-professional-specialties';
import { userSpecialtiesQueryOptions } from './use-user-specialties';

export type ProfessionalAssignments = {
    credentialsByMembership: Record<number, UserSpecialty[]>;
    assignedSpecialtiesByMembership: Record<number, ProfessionalSpecialty[]>;
    assignedServicesByMembership: Record<number, ProfessionalService[]>;
};

/** Loader helper (ADR 0007): every professional's credentials, specialties and services, keyed for Ajustes' org-wide sections. */
export async function loadProfessionalAssignments(
    queryClient: QueryClient,
    professionals: Membership[],
): Promise<ProfessionalAssignments> {
    const assignments: ProfessionalAssignments = {
        credentialsByMembership: {},
        assignedSpecialtiesByMembership: {},
        assignedServicesByMembership: {},
    };

    const [perMembershipSpecialties, perMembershipServices] = await Promise.all(
        [
            Promise.all(
                professionals.map((membership) =>
                    Promise.all([
                        queryClient.ensureQueryData(
                            userSpecialtiesQueryOptions(membership.user.id),
                        ),
                        queryClient.ensureQueryData(
                            professionalSpecialtiesQueryOptions(membership.id),
                        ),
                    ]),
                ),
            ),
            Promise.all(
                professionals.map((membership) =>
                    queryClient.ensureQueryData(
                        professionalServicesQueryOptions(membership.id),
                    ),
                ),
            ),
        ],
    );

    professionals.forEach((membership, index) => {
        const [credentials, assignedSpecialties] =
            perMembershipSpecialties[index];
        assignments.credentialsByMembership[membership.user.id] = credentials;
        assignments.assignedSpecialtiesByMembership[membership.id] =
            assignedSpecialties;
        assignments.assignedServicesByMembership[membership.id] =
            perMembershipServices[index];
    });

    return assignments;
}
