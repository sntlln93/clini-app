import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Availability } from '@/types/availability';
import { useState } from 'react';
import {
    useDeleteAvailability,
    useSaveAvailability,
} from '../-hooks/use-availabilities';

type AvailabilitySlotRowProps = {
    membershipId: number;
    dayOfWeek: number;
    slot: Availability | null;
    canManage: boolean;
    onSaved?: () => void;
    onCancel?: () => void;
};

export function AvailabilitySlotRow({
    membershipId,
    dayOfWeek,
    slot,
    canManage,
    onSaved,
    onCancel,
}: AvailabilitySlotRowProps) {
    const [startTime, setStartTime] = useState(slot?.start_time ?? '09:00');
    const [endTime, setEndTime] = useState(slot?.end_time ?? '10:00');
    const [appliedId, setAppliedId] = useState<number | null>(null);

    // Adjust state during render instead of an Effect: sync local fields
    // whenever this row's slot (re)loads or changes remotely.
    if (slot && slot.id !== appliedId) {
        setAppliedId(slot.id);
        setStartTime(slot.start_time);
        setEndTime(slot.end_time);
    }

    const save = useSaveAvailability(membershipId);
    const remove = useDeleteAvailability(membershipId);

    function handleSave() {
        save.mutate(
            { id: slot?.id, dayOfWeek, startTime, endTime },
            { onSuccess: () => onSaved?.() },
        );
    }

    function handleDelete() {
        if (slot) {
            remove.mutate(slot.id);
        }
    }

    return (
        <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1 text-xs text-muted-foreground">
                Desde
                <Input
                    type="time"
                    disabled={!canManage}
                    className="w-28"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
                Hasta
                <Input
                    type="time"
                    disabled={!canManage}
                    className="w-28"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                />
            </label>

            {canManage && (
                <div className="flex gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={save.isPending}
                        onClick={handleSave}
                    >
                        Guardar
                    </Button>
                    {slot ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={remove.isPending}
                            onClick={handleDelete}
                        >
                            Eliminar
                        </Button>
                    ) : (
                        onCancel && (
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={onCancel}
                            >
                                Cancelar
                            </Button>
                        )
                    )}
                </div>
            )}

            {save.message && (
                <p className="w-full text-sm text-destructive">
                    {save.errors.end_time ??
                        save.errors.start_time ??
                        save.message}
                </p>
            )}
        </div>
    );
}
