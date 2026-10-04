import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { CatalogService, ProfessionalService } from '@/types/professional';
import { useId, useState } from 'react';
import {
    useAssignProfessionalService,
    useRemoveProfessionalService,
    useUpdateProfessionalService,
} from '../-hooks/use-professional-services';
import { ServiceAssignmentFields } from './ServiceAssignmentFields';
import {
    centsToPesosInput,
    parseDurationInput,
    pesosInputToCents,
} from './service-price';

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
    // Both kept as raw input strings, so clearing a field doesn't silently turn it into 0.
    const [duration, setDuration] = useState(
        String(assignment?.duration_minutes ?? DEFAULT_DURATION_MINUTES),
    );
    const [price, setPrice] = useState(
        centsToPesosInput(assignment?.price_cents ?? null),
    );
    const [active, setActive] = useState(assignment?.active ?? true);
    const [appliedId, setAppliedId] = useState<number | null>(null);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

    // Adjust state during render (react-hooks/set-state-in-effect), not an Effect.
    if (assignment && assignment.id !== appliedId) {
        setAppliedId(assignment.id);
        setDuration(String(assignment.duration_minutes));
        setPrice(centsToPesosInput(assignment.price_cents));
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
        const durationMinutes = parseDurationInput(duration);
        const priceCents = pesosInputToCents(price);
        // The save button is disabled while either is invalid; this only narrows the types.
        if (durationMinutes === undefined || priceCents === undefined) {
            return;
        }

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
                    duration={duration}
                    price={price}
                    active={active}
                    canManage={canManage}
                    isSaving={update.isPending}
                    onDurationChange={setDuration}
                    onPriceChange={setPrice}
                    onActiveChange={setActive}
                    onSave={handleSave}
                />
            )}

            <ConfirmDialog
                open={showRemoveConfirm}
                onOpenChange={setShowRemoveConfirm}
                title="Quitar servicio"
                description="¿Quitar este servicio del profesional? Deja de ofrecerse en la reserva online y se pierden la duración y el precio configurados; si lo volvés a asignar, vuelve con los valores por defecto."
                onConfirm={handleConfirmRemove}
                isPending={remove.isPending}
            />
        </div>
    );
}
