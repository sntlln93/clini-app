import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Membership } from '@/types/membership';
import { useId, useState } from 'react';
import { useUpdateMyPublicLink } from '../-hooks/use-my-public-link';
import { PublicLinkActions } from './PublicLinkActions';

type MyPublicLinkSectionProps = {
    membership: Pick<Membership, 'id' | 'slug'>;
};

function bookingUrl(slug: string): string {
    return `${window.location.origin}/reservar/${slug}`;
}

export function MyPublicLinkSection({ membership }: MyPublicLinkSectionProps) {
    const slugInputId = useId();
    const [appliedId, setAppliedId] = useState<number | null>(null);
    const [slug, setSlug] = useState(membership.slug ?? '');

    // Adjust state during render (react-hooks/set-state-in-effect), not an Effect.
    if (membership.id !== appliedId) {
        setAppliedId(membership.id);
        setSlug(membership.slug ?? '');
    }

    const { mutate, isPending } = useUpdateMyPublicLink();

    const savedSlug = membership.slug ?? '';
    const trimmedSlug = slug.trim();
    const isDirty = trimmedSlug !== savedSlug;

    function handleSave() {
        mutate(trimmedSlug === '' ? null : trimmedSlug);
    }

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Mi link público</h2>
                <p className="text-sm text-muted-foreground">
                    Definí un link propio para que tus pacientes reserven turnos
                    directamente con vos, sin pasar por el resto del
                    consultorio. Dejalo vacío y guardá para quitar el link.
                </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-48 flex-1 space-y-1">
                    <Label
                        htmlFor={slugInputId}
                        className="text-xs text-muted-foreground"
                    >
                        Link
                    </Label>
                    <div className="flex min-w-0 items-center gap-1">
                        <span className="min-w-0 shrink truncate text-sm text-muted-foreground">
                            {window.location.host}/reservar/
                        </span>
                        <Input
                            id={slugInputId}
                            className="min-w-24 flex-1"
                            value={slug}
                            onChange={(event) => setSlug(event.target.value)}
                            placeholder="tu-nombre"
                            maxLength={50}
                        />
                    </div>
                </div>
                <Button
                    type="button"
                    size="sm"
                    disabled={isPending || !isDirty}
                    onClick={handleSave}
                >
                    Guardar
                </Button>
            </div>

            {isDirty && trimmedSlug !== '' && (
                <p className="text-sm break-all text-muted-foreground">
                    Vista previa (sin guardar): {bookingUrl(trimmedSlug)}
                </p>
            )}

            {isDirty && trimmedSlug === '' && savedSlug !== '' && (
                <p className="text-sm text-muted-foreground">
                    Si guardás con el campo vacío, se elimina tu link público y
                    deja de recibir reservas.
                </p>
            )}

            {savedSlug !== '' && (
                <PublicLinkActions url={bookingUrl(savedSlug)} />
            )}
        </section>
    );
}
