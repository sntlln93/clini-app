import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useId } from 'react';
import {
    formatPesos,
    parseDurationInput,
    pesosInputToCents,
} from './service-price';

type ServiceAssignmentFieldsProps = {
    duration: string;
    price: string;
    active: boolean;
    canManage: boolean;
    isSaving: boolean;
    onDurationChange: (value: string) => void;
    onPriceChange: (value: string) => void;
    onActiveChange: (value: boolean) => void;
    onSave: () => void;
};

export function ServiceAssignmentFields({
    duration,
    price,
    active,
    canManage,
    isSaving,
    onDurationChange,
    onPriceChange,
    onActiveChange,
    onSave,
}: ServiceAssignmentFieldsProps) {
    const durationInputId = useId();
    const durationHintId = useId();
    const priceInputId = useId();
    const priceHintId = useId();
    const activeSwitchId = useId();

    const durationValid = parseDurationInput(duration) !== undefined;
    const priceCents = pesosInputToCents(price);
    const priceValid = priceCents !== undefined;

    return (
        <div className="flex flex-wrap items-start gap-3">
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
                    step={1}
                    disabled={!canManage}
                    className="w-24"
                    value={duration}
                    aria-invalid={!durationValid}
                    aria-describedby={
                        durationValid ? undefined : durationHintId
                    }
                    onChange={(event) => onDurationChange(event.target.value)}
                />
                {!durationValid && (
                    <p id={durationHintId} className="text-xs text-destructive">
                        La duración debe ser de al menos 1 minuto
                    </p>
                )}
            </div>
            <div className="space-y-1">
                <Label
                    htmlFor={priceInputId}
                    className="text-xs text-muted-foreground"
                >
                    Precio ($)
                </Label>
                <Input
                    id={priceInputId}
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    disabled={!canManage}
                    className="w-32"
                    value={price}
                    aria-invalid={!priceValid}
                    aria-describedby={priceHintId}
                    onChange={(event) => onPriceChange(event.target.value)}
                />
                <p
                    id={priceHintId}
                    className={
                        priceValid
                            ? 'text-xs text-muted-foreground'
                            : 'text-xs text-destructive'
                    }
                >
                    {!priceValid
                        ? 'El precio no puede ser negativo'
                        : priceCents === null
                          ? 'Sin precio'
                          : formatPesos(priceCents)}
                </p>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
                Moneda
                <p className="flex h-8 items-center text-sm text-foreground">
                    ARS
                </p>
            </div>
            <div className="space-y-1">
                <Label
                    htmlFor={activeSwitchId}
                    className="text-xs text-muted-foreground"
                >
                    Activo
                </Label>
                <div className="flex h-8 items-center">
                    <Switch
                        id={activeSwitchId}
                        disabled={!canManage}
                        checked={active}
                        onCheckedChange={onActiveChange}
                    />
                </div>
            </div>
            {canManage && (
                <div className="w-full">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isSaving || !durationValid || !priceValid}
                        onClick={onSave}
                    >
                        Guardar
                    </Button>
                </div>
            )}
        </div>
    );
}
