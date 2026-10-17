import { Button } from '@/components/ui/button';
import {
    Field,
    FieldError,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useHydrated } from '@/hooks/use-hydrated';
import { Loader2 } from 'lucide-react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import type { PlanId } from './plans';

type ControlProps = {
    id: string;
    'aria-invalid'?: true;
    'aria-describedby'?: string;
};

/** A labelled control with its error; `children` gets the ids that tie them together. */
export function FormField({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: (control: ControlProps) => ReactNode;
}) {
    const id = useId();
    const errorId = `${id}-error`;

    return (
        <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {children({
                id,
                'aria-invalid': error ? true : undefined,
                'aria-describedby': error ? errorId : undefined,
            })}
            {error && <FieldError id={errorId}>{error}</FieldError>}
        </Field>
    );
}

const UNSURE = 'unsure';

const PLAN_OPTIONS: Array<{ value: PlanId | typeof UNSURE; label: string }> = [
    { value: 'centro', label: 'Centro' },
    { value: 'consultorio', label: 'Consultorio' },
    { value: 'free', label: 'Gratis' },
    { value: UNSURE, label: 'Todavía no sé' },
];

function isPlanId(value: unknown): value is PlanId {
    return PLAN_OPTIONS.some(
        (option) => option.value !== UNSURE && option.value === value,
    );
}

/** "¿Qué plan te interesa?"; `null` = the visitor doesn't know yet. */
export function PlanField({
    value,
    error,
    onChange,
}: {
    value: PlanId | null;
    error?: string;
    onChange: (plan: PlanId | null) => void;
}) {
    const id = useId();

    return (
        <FieldSet>
            <FieldLegend variant="label">¿Qué plan te interesa?</FieldLegend>
            {/* Side by side on a coarse pointer, radios need gap-4 (theme.css). */}
            <RadioGroup
                value={value ?? UNSURE}
                onValueChange={(plan) => onChange(isPlanId(plan) ? plan : null)}
                className="grid grid-cols-2 gap-4 sm:grid-cols-4"
            >
                {PLAN_OPTIONS.map((option) => (
                    <Field key={option.value} orientation="horizontal">
                        <RadioGroupItem
                            value={option.value}
                            id={`${id}-${option.value}`}
                        />
                        <FieldLabel
                            htmlFor={`${id}-${option.value}`}
                            className="font-normal"
                        >
                            {option.label}
                        </FieldLabel>
                    </Field>
                ))}
            </RadioGroup>
            {error && <FieldError>{error}</FieldError>}
        </FieldSet>
    );
}

/** Off-screen and out of the accessibility tree, so only a bot fills it (the API then stores nothing). */
export function Honeypot(
    props: Pick<ComponentProps<'input'>, 'value' | 'onChange'>,
) {
    return (
        <div
            aria-hidden="true"
            className="absolute left-[-9999px] size-px overflow-hidden"
        >
            <label>
                Sitio web
                <input tabIndex={-1} autoComplete="off" {...props} />
            </label>
        </div>
    );
}

export function SubmitRow({
    submitting,
    error,
}: {
    submitting: boolean;
    error: string | null;
}) {
    // Before hydration a submit would be the browser's own GET to
    // /contacto, wiping what the visitor typed: wait for React.
    const hydrated = useHydrated();

    return (
        <>
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button
                    type="submit"
                    disabled={submitting || !hydrated}
                    className="h-12 rounded-full px-6 text-[0.95rem] font-medium"
                >
                    {submitting && (
                        <Loader2
                            data-icon="inline-start"
                            className="animate-spin"
                        />
                    )}
                    Enviar consulta
                </Button>
                <p className="max-w-[46ch] text-xs text-muted-foreground">
                    Usamos estos datos solo para responder tu consulta, y los
                    borramos 6 meses después de cerrarla.
                </p>
            </div>
        </>
    );
}
