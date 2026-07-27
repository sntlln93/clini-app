import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type {
    AvailabilityException,
    AvailabilityExceptionType,
} from '@/types/availability';
import { useState } from 'react';
import { useSaveAvailabilityException } from '../-hooks/use-availability-exceptions';

const TYPE_OPTIONS: { value: AvailabilityExceptionType; label: string }[] = [
    { value: 'blocked', label: 'Bloqueo' },
    { value: 'extra', label: 'Extra' },
];

type AvailabilityExceptionFormProps = {
    membershipId: number;
    canManageOrgWide: boolean;
    exception?: AvailabilityException;
    onDone: () => void;
};

export function AvailabilityExceptionForm({
    membershipId,
    canManageOrgWide,
    exception,
    onDone,
}: AvailabilityExceptionFormProps) {
    const [type, setType] = useState<AvailabilityExceptionType>(
        exception?.type ?? 'blocked',
    );
    const [startAt, setStartAt] = useState(exception?.start_at ?? '');
    const [endAt, setEndAt] = useState(exception?.end_at ?? '');
    const [reason, setReason] = useState(exception?.reason ?? '');
    const [isOrgWide, setIsOrgWide] = useState(
        exception ? exception.membership_id === null : false,
    );

    const save = useSaveAvailabilityException(membershipId);

    function handleSubmit() {
        save.mutate(
            {
                id: exception?.id,
                membershipId: isOrgWide ? null : membershipId,
                type,
                startAt,
                endAt,
                reason: reason || null,
            },
            { onSuccess: () => onDone() },
        );
    }

    return (
        <div className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-end gap-3">
                <label className="space-y-1 text-xs text-muted-foreground">
                    Tipo
                    <Select
                        value={type}
                        onValueChange={(value) =>
                            setType(value as AvailabilityExceptionType)
                        }
                    >
                        <SelectTrigger className="w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {TYPE_OPTIONS.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                    Desde
                    <Input
                        type="datetime-local"
                        className="w-52"
                        value={startAt}
                        onChange={(event) => setStartAt(event.target.value)}
                    />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                    Hasta
                    <Input
                        type="datetime-local"
                        className="w-52"
                        value={endAt}
                        onChange={(event) => setEndAt(event.target.value)}
                    />
                </label>
            </div>

            <label className="space-y-1 text-xs text-muted-foreground">
                Motivo
                <Input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                />
            </label>

            {canManageOrgWide && (
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                        checked={isOrgWide}
                        onCheckedChange={(checked) =>
                            setIsOrgWide(checked === true)
                        }
                    />
                    Aplicar a toda la organización
                </label>
            )}

            {save.message && (
                <p className="text-sm text-destructive">
                    {save.errors.end_at ?? save.errors.start_at ?? save.message}
                </p>
            )}

            <div className="flex gap-2">
                <Button
                    type="button"
                    size="sm"
                    disabled={save.isPending}
                    onClick={handleSubmit}
                >
                    Guardar
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onDone}
                >
                    Cancelar
                </Button>
            </div>
        </div>
    );
}
