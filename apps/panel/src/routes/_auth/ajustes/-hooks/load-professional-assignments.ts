import type { Membership } from '@/types/membership';
import type {
    ProfessionalService,
    ProfessionalSpecialty,
    Specialty,
} from '@/types/professional';
import type { QueryClient } from '@tanstack/react-query';
import { backedSpecialtiesQueryOptions } from './use-backed-specialties';
import { professionalServicesQueryOptions } from './use-professional-services';
import { professionalSpecialtiesQueryOptions } from './use-professional-specialties';

export type ProfessionalAssignments = {
    backedByMembership: Record<number, Specialty[]>;
    assignedSpecialtiesByMembership: Record<number, ProfessionalSpecialty[]>;
    assignedServicesByMembership: Record<number, ProfessionalService[]>;
};

/** Loader helper (ADR 0007): every professional's backed and offered specialties and their services, keyed by membership for Ajustes' org-wide sections. */
export async function loadProfessionalAssignments(
    queryClient: QueryClient,
    professionals: Membership[],
): Promise<ProfessionalAssignments> {
    const assignments: ProfessionalAssignments = {
        backedByMembership: {},
        assignedSpecialtiesByMembership: {},
        assignedServicesByMembership: {},
    };

    const [perMembershipSpecialties, perMembershipServices] = await Promise.all(
        [
            Promise.all(
                professionals.map((membership) =>
                    Promise.all([
                        queryClient.ensureQueryData(
                            backedSpecialtiesQueryOptions(membership.id),
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
        const [backed, assignedSpecialties] = perMembershipSpecialties[index];
        assignments.backedByMembership[membership.id] = backed;
        assignments.assignedSpecialtiesByMembership[membership.id] =
            assignedSpecialties;
        assignments.assignedServicesByMembership[membership.id] =
            perMembershipServices[index];
    });

    return assignments;
}
