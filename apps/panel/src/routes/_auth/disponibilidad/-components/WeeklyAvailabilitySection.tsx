import { QueryErrorState } from '@/components/QueryErrorState';
import { Button } from '@/components/ui/button';
import type { Availability } from '@/types/availability';
import { useState } from 'react';
import { useAvailabilities } from '../-hooks/use-availabilities';
import { AvailabilitySlotRow } from './AvailabilitySlotRow';

const WEEKDAY_LABELS = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
];

type WeeklyAvailabilitySectionProps = {
    membershipId: number;
    canManage: boolean;
};

export function WeeklyAvailabilitySection({
    membershipId,
    canManage,
}: WeeklyAvailabilitySectionProps) {
    const {
        data: slots,
        isPending,
        isError,
        error,
    } = useAvailabilities(membershipId);
    const [addingDay, setAddingDay] = useState<number | null>(null);

    const slotsByDay: Availability[][] = Array.from({ length: 7 }, (_, day) =>
        (slots ?? []).filter((slot) => slot.day_of_week === day),
    );

    return (
        <section className="space-y-3">
            <h2 className="text-sm font-medium">Horarios semanales</h2>

            {isError && <QueryErrorState error={error} />}

            {!isError && isPending && (
                <p className="text-sm text-muted-foreground">Cargando…</p>
            )}

            {!isError && !isPending && (
                <div className="space-y-3">
                    {WEEKDAY_LABELS.map((label, day) => (
                        <div
                            key={day}
                            className="space-y-2 rounded-md border p-3"
                        >
                            <p className="text-sm font-medium">{label}</p>

                            {slotsByDay[day].length === 0 &&
                                addingDay !== day && (
                                    <p className="text-sm text-muted-foreground">
                                        Sin atención
                                    </p>
                                )}

                            <div className="space-y-2">
                                {slotsByDay[day].map((slot) => (
                                    <AvailabilitySlotRow
                                        key={slot.id}
                                        membershipId={membershipId}
                                        dayOfWeek={day}
                                        slot={slot}
                                        canManage={canManage}
                                    />
                                ))}

                                {addingDay === day && (
                                    <AvailabilitySlotRow
                                        membershipId={membershipId}
                                        dayOfWeek={day}
                                        slot={null}
                                        canManage={canManage}
                                        onSaved={() => setAddingDay(null)}
                                        onCancel={() => setAddingDay(null)}
                                    />
                                )}
                            </div>

                            {canManage && addingDay !== day && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setAddingDay(day)}
                                >
                                    Agregar franja
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
