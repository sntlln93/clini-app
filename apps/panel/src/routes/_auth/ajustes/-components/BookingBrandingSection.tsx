import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlanFeatureNote } from '@/features/plan-feature-note/PlanFeatureNote';
import { usePlanIncludes } from '@/lib/plan';
import type { OrganizationLogo } from '@/types/organization';
import { useId, useState, type ChangeEvent } from 'react';
import {
    useRemoveOrganizationLogo,
    useUploadOrganizationLogo,
} from '../-hooks/use-organization-logo';
import { LOGO_ACCEPT, logoFileError } from './logo-file';

type BookingBrandingSectionProps = {
    logo: OrganizationLogo;
};

/** Owner and admin (`organization.manage`): the booking page's logo (#239). */
export function BookingBrandingSection({ logo }: BookingBrandingSectionProps) {
    const inputId = useId();
    const errorId = useId();
    const [fileError, setFileError] = useState<string | null>(null);
    // Free can't upload, but can still remove a logo kept from a paid plan.
    const canBrand = usePlanIncludes('booking_branding');
    const upload = useUploadOrganizationLogo();
    const remove = useRemoveOrganizationLogo();
    const isPending = upload.isPending || remove.isPending;

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        // Lets the same file be picked again after an error.
        event.target.value = '';

        if (!file) {
            return;
        }

        const error = logoFileError(file);
        setFileError(error);

        if (error === null) {
            upload.mutate(file);
        }
    }

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">
                    Logo de la página de reservas
                </h2>
                <p className="text-sm text-muted-foreground">
                    Se muestra en tu página de reservas y en los recordatorios
                    por mail, sin «Hecho con Clini». PNG, JPG o WebP de hasta
                    512 KB.
                </p>
            </div>

            {!canBrand && (
                <PlanFeatureNote>
                    El plan Gratis muestra «Hecho con Clini» en tu página de
                    reservas y no incluye logo propio.
                    {logo.logo_url !== null &&
                        ' El logo que subiste queda guardado y vuelve a mostrarse al cambiar de plan.'}
                </PlanFeatureNote>
            )}

            {logo.logo_url !== null && (
                <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-2xl border bg-card p-3">
                        <img
                            src={logo.logo_url}
                            alt="Logo actual"
                            className="max-h-16 max-w-60 object-contain"
                        />
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => remove.mutate()}
                    >
                        Quitar logo
                    </Button>
                </div>
            )}

            {canBrand && (
                <div className="space-y-1">
                    <Label
                        htmlFor={inputId}
                        className="text-xs text-muted-foreground"
                    >
                        {logo.logo_url === null ? 'Subir logo' : 'Cambiar logo'}
                    </Label>
                    <Input
                        id={inputId}
                        type="file"
                        accept={LOGO_ACCEPT}
                        disabled={isPending}
                        onChange={handleFileChange}
                        aria-invalid={fileError !== null}
                        aria-describedby={fileError ? errorId : undefined}
                    />
                    {fileError && (
                        <p id={errorId} className="text-sm text-destructive">
                            {fileError}
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}
