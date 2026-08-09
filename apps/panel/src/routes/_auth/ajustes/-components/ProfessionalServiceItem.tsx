import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { CatalogService, ProfessionalService } from '@/types/professional';
import { useId, useState } from 'react';
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
    const assignedCheckboxId = useId();
    const [durationMinutes, setDurationMinutes] = useState(
        assignment?.duration_minutes ?? DEFAULT_DURATION_MINUTES,
    );
    const [priceCents, setPriceCents] = useState(
        assignment?.price_cents ?? null,
    );
    const [active, setActive] = useState(assignment?.active ?? true);
    const [appliedId, setAppliedId] = useState<number | null>(null);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

    // Adjust state during render (react-hooks/set-state-in-effect), not an Effect.
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
            setShowRemoveConfirm(true);
        }
    }

    function handleConfirmRemove() {
        remove.mutate(service.id);
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
            <div className="flex items-center gap-2">
                <Checkbox
                    id={assignedCheckboxId}
                    disabled={!canManage}
                    checked={assignment !== null}
                    onCheckedChange={(checked) =>
                        handleToggleAssigned(checked === true)
                    }
                />
                <Label
                    htmlFor={assignedCheckboxId}
                    className="text-sm font-medium"
                >
                    {service.name}
                </Label>
            </div>

            {message && <p className="text-sm text-destructive">{message}</p>}

            {assignment && (
                <ServiceAssignmentFields
                    durationMinutes={durationMinutes}
                    priceCents={priceCents}
                    active={active}
                    canManage={canManage}
                    isSaving={update.isPending}
                    onDurationChange={setDurationMinutes}
                    onPriceChange={setPriceCents}
                    onActiveChange={setActive}
                    onSave={handleSave}
                />
            )}

            <ConfirmDialog
                open={showRemoveConfirm}
                onOpenChange={setShowRemoveConfirm}
                title="Quitar servicio"
                description="¿Quitar este servicio del profesional? Esta acción no se puede deshacer."
                onConfirm={handleConfirmRemove}
                isPending={remove.isPending}
            />
        </div>
    );
}

type ServiceAssignmentFieldsProps = {
    durationMinutes: number;
    priceCents: number | null;
    active: boolean;
    canManage: boolean;
    isSaving: boolean;
    onDurationChange: (value: number) => void;
    onPriceChange: (value: number | null) => void;
    onActiveChange: (value: boolean) => void;
    onSave: () => void;
};

function ServiceAssignmentFields({
    durationMinutes,
    priceCents,
    active,
    canManage,
    isSaving,
    onDurationChange,
    onPriceChange,
    onActiveChange,
    onSave,
}: ServiceAssignmentFieldsProps) {
    const durationInputId = useId();
    const priceInputId = useId();
    const activeSwitchId = useId();

    return (
        <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
                <Label
                    htmlFor={durationInputId}
                    className="text-xs text-muted-foreground"
                >
                    Duración (min)
                </Label>
                <Input
                    id={durationInputId}
                    type="number"
                    min={1}
                    disabled={!canManage}
                    className="w-24"
                    value={durationMinutes}
                    onChange={(event) =>
                        onDurationChange(Number(event.target.value))
                    }
                />
            </div>
            <div className="space-y-1">
                <Label
                    htmlFor={priceInputId}
                    className="text-xs text-muted-foreground"
                >
                    Precio (centavos)
                </Label>
                <Input
                    id={priceInputId}
                    type="number"
                    min={0}
                    disabled={!canManage}
                    className="w-32"
                    value={priceCents ?? ''}
                    onChange={(event) =>
                        onPriceChange(
                            event.target.value
                                ? Number(event.target.value)
                                : null,
                        )
                    }
                />
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
                Moneda
                <p className="flex h-9 items-center text-sm text-foreground">
                    ARS
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Label
                    htmlFor={activeSwitchId}
                    className="text-xs text-muted-foreground"
                >
                    Activo
                </Label>
                <Switch
                    id={activeSwitchId}
                    disabled={!canManage}
                    checked={active}
                    onCheckedChange={onActiveChange}
                />
            </div>
            {canManage && (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSaving}
                    onClick={onSave}
                >
                    Guardar
                </Button>
            )}
        </div>
    );
}
