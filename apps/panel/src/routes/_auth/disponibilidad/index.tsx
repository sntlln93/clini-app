import { QueryErrorState } from '@/components/QueryErrorState';
import { useProfessionals } from '@/hooks/use-professionals';
import { useSession } from '@/lib/session';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AvailabilityExceptionsSection } from './-components/AvailabilityExceptionsSection';
import { ProfessionalPicker } from './-components/ProfessionalPicker';
import { WeeklyAvailabilitySection } from './-components/WeeklyAvailabilitySection';
import { useAvailabilityPermissions } from './-hooks/use-availability-permissions';

export const Route = createFileRoute('/_auth/disponibilidad/')({
    component: DisponibilidadPage,
});

function DisponibilidadPage() {
    const { data: session } = useSession();
    const {
        data: professionals,
        isPending,
        isError,
        error,
    } = useProfessionals();
    const { canManageOrgWide, canManage } = useAvailabilityPermissions();
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const ownMembership = professionals?.find(
        (membership) => membership.user.id === session?.id,
    );

    // Adjust state during render instead of an Effect: default the
    // selection once the professional list loads — the acting user's own
    // membership when they can only manage their own, otherwise the first
    // one in the org-wide list.
    if (selectedId === null && professionals && professionals.length > 0) {
        setSelectedId(
            canManageOrgWide
                ? professionals[0].id
                : (ownMembership?.id ?? professionals[0].id),
        );
    }

    const selectedMembership = professionals?.find(
        (membership) => membership.id === selectedId,
    );

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold">Disponibilidad</h1>
                <p className="text-sm text-muted-foreground">
                    Configurá los horarios de atención y las excepciones de cada
                    profesional.
                </p>
            </div>

            {isError && <QueryErrorState error={error} />}

            {!isError && isPending && (
                <p className="text-sm text-muted-foreground">Cargando…</p>
            )}

            {!isError &&
                !isPending &&
                professionals &&
                professionals.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        Todavía no hay profesionales en esta organización.
                    </p>
                )}

            {!isError &&
                !isPending &&
                professionals &&
                professionals.length > 0 && (
                    <div className="space-y-6">
                        {canManageOrgWide && (
                            <ProfessionalPicker
                                professionals={professionals}
                                selectedId={selectedId}
                                onSelect={setSelectedId}
                            />
                        )}

                        {selectedMembership && (
                            <>
                                <WeeklyAvailabilitySection
                                    membershipId={selectedMembership.id}
                                    canManage={canManage(selectedMembership)}
                                />
                                <AvailabilityExceptionsSection
                                    membershipId={selectedMembership.id}
                                    canManageOwn={canManage(selectedMembership)}
                                    canManageOrgWide={canManageOrgWide}
                                />
                            </>
                        )}
                    </div>
                )}
        </div>
    );
}
