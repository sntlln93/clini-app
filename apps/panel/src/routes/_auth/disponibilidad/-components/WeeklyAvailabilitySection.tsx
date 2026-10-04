import { Button } from '@/components/ui/button';
import type { Availability } from '@/types/availability';
import { useState } from 'react';
import type { AvailabilityReadOnlyReason } from '../-hooks/use-availability-permissions';
import { AvailabilityReadOnlyNote } from './AvailabilityReadOnlyNote';
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

// Monday-first display order; `day_of_week` itself stays 0 = Sunday.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type WeeklyAvailabilitySectionProps = {
    membershipId: number;
    canManage: boolean;
    readOnlyReason: AvailabilityReadOnlyReason | null;
    slots: Availability[];
};

export function WeeklyAvailabilitySection({
    membershipId,
    canManage,
    readOnlyReason,
    slots,
}: WeeklyAvailabilitySectionProps) {
    const [addingDay, setAddingDay] = useState<number | null>(null);

    const slotsByDay: Availability[][] = Array.from({ length: 7 }, (_, day) =>
        slots.filter((slot) => slot.day_of_week === day),
    );

    return (
        <section className="space-y-3">
            <h2 className="text-sm font-medium">Horarios semanales</h2>

            {readOnlyReason && (
                <AvailabilityReadOnlyNote reason={readOnlyReason} />
            )}

            <div className="space-y-3">
                {DISPLAY_ORDER.map((day) => (
                    <div key={day} className="space-y-2 rounded-md border p-3">
                        <p className="text-sm font-medium">
                            {WEEKDAY_LABELS[day]}
                        </p>

                        {slotsByDay[day].length === 0 && addingDay !== day && (
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
        </section>
    );
}
