import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Membership } from '@/types/membership';
import { useState } from 'react';
import { useUpdateMyPublicLink } from '../-hooks/use-my-public-link';

type MyPublicLinkSectionProps = {
    membership: Membership;
};

export function MyPublicLinkSection({ membership }: MyPublicLinkSectionProps) {
    const [appliedId, setAppliedId] = useState<number | null>(null);
    const [slug, setSlug] = useState(membership.slug ?? '');

    // Adjust state during render instead of an Effect: sync the local field
    // whenever this membership (re)loads or changes remotely.
    if (membership.id !== appliedId) {
        setAppliedId(membership.id);
        setSlug(membership.slug ?? '');
    }

    const { mutate, isPending } = useUpdateMyPublicLink();

    function handleSave() {
        const trimmed = slug.trim();
        mutate(trimmed === '' ? null : trimmed);
    }

    const trimmedSlug = slug.trim();
    const previewUrl = `${window.location.origin}/reservar/${trimmedSlug}`;

    return (
        <section className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-sm font-medium">Mi link público</h2>
                <p className="text-sm text-muted-foreground">
                    Definí un link propio para que tus pacientes reserven
                    turnos directamente con vos, sin pasar por el resto del
                    consultorio. Dejalo vacío y guardá para quitar el link.
                </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-48 flex-1 space-y-1 text-xs text-muted-foreground">
                    Link
                    <Input
                        value={slug}
                        onChange={(event) => setSlug(event.target.value)}
                        placeholder="tu-nombre"
                        maxLength={50}
                    />
                </label>
                <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={handleSave}
                >
                    Guardar
                </Button>
            </div>

            {trimmedSlug !== '' && (
                <p className="text-sm text-muted-foreground">
                    Tu link: {previewUrl}
                </p>
            )}
        </section>
    );
}
