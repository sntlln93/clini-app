import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { CatalogService, ProfessionalService } from '@/types/professional';
import { useState } from 'react';
import {
    useAssignProfessionalService,
    useRemoveProfessionalService,
    useUpdateProfessionalService,
} from '../-hooks/use-professional-services';

const DEFAULT_DURATION_MINUTES = 30;

type ProfessionalServiceItemProps = {
    membershipId: number;
    service: CatalogService;
    assignment: ProfessionalService | null;
    canManage: boolean;
};

export function ProfessionalServiceItem({
    membershipId,
    service,
    assignment,
    canManage,
}: ProfessionalServiceItemProps) {
    const [durationMinutes, setDurationMinutes] = useState(
        assignment?.duration_minutes ?? DEFAULT_DURATION_MINUTES,
    );
    const [priceCents, setPriceCents] = useState(
        assignment?.price_cents ?? null,
    );
    const [active, setActive] = useState(assignment?.active ?? true);
    const [appliedId, setAppliedId] = useState<number | null>(null);

    // Adjust state during render instead of an Effect: sync local fields
    // whenever this item's assignment (re)loads or changes remotely.
    if (assignment && assignment.id !== appliedId) {
        setAppliedId(assignment.id);
        setDurationMinutes(assignment.duration_minutes);
        setPriceCents(assignment.price_cents);
        setActive(assignment.active);
    }

    const assign = useAssignProfessionalService(membershipId);
    const update = useUpdateProfessionalService(membershipId);
    const remove = useRemoveProfessionalService(membershipId);
    const message = assign.message ?? update.message;

    function handleToggleAssigned(checked: boolean) {
        if (checked) {
            assign.mutate({
                serviceId: service.id,
                durationMinutes: DEFAULT_DURATION_MINUTES,
                priceCents: null,
                active: true,
            });
        } else if (assignment) {
            remove.mutate(service.id);
        }
    }

    function handleSave() {
        update.mutate({
            serviceId: service.id,
            durationMinutes,
            priceCents,
            active,
        });
    }

    return (
        <div className="space-y-2 rounded-md border p-2">
            <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                    disabled={!canManage}
                    checked={assignment !== null}
                    onCheckedChange={(checked) =>
                        handleToggleAssigned(checked === true)
                    }
                />
                {service.name}
            </label>

            {message && <p className="text-sm text-destructive">{message}</p>}

            {assignment && (
                <div className="flex flex-wrap items-end gap-3">
                    <label className="space-y-1 text-xs text-muted-foreground">
                        Duración (min)
                        <Input
                            type="number"
                            min={1}
                            disabled={!canManage}
                            className="w-24"
                            value={durationMinutes}
                            onChange={(event) =>
                                setDurationMinutes(Number(event.target.value))
                            }
                        />
                    </label>
                    <label className="space-y-1 text-xs text-muted-foreground">
                        Precio (centavos)
                        <Input
                            type="number"
                            min={0}
                            disabled={!canManage}
                            className="w-32"
                            value={priceCents ?? ''}
                            onChange={(event) =>
                                setPriceCents(
                                    event.target.value
                                        ? Number(event.target.value)
                                        : null,
                                )
                            }
                        />
                    </label>
                    <div className="space-y-1 text-xs text-muted-foreground">
                        Moneda
                        <p className="flex h-9 items-center text-sm text-foreground">
                            ARS
                        </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        Activo
                        <Switch
                            disabled={!canManage}
                            checked={active}
                            onCheckedChange={setActive}
                        />
                    </label>
                    {canManage && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={update.isPending}
                            onClick={handleSave}
                        >
                            Guardar
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
