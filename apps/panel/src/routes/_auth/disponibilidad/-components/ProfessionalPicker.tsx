import { useId, useMemo } from 'react';

import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Membership } from '@/types/membership';

type ProfessionalPickerProps = {
    professionals: Membership[];
    selectedId: number | null;
    onSelect: (membershipId: number) => void;
};

/**
 * Only rendered by the page when the acting user holds availability.manage
 * (org-wide) — a holder of only availability.manage.own never sees this,
 * their own membership is selected implicitly instead.
 */
export function ProfessionalPicker({
    professionals,
    selectedId,
    onSelect,
}: ProfessionalPickerProps) {
    const triggerId = useId();
    const professionalItems = useMemo(
        () =>
            professionals.map((membership) => ({
                value: String(membership.id),
                label: membership.user.name ?? membership.user.email,
            })),
        [professionals],
    );

    return (
        <div className="space-y-1">
            <Label htmlFor={triggerId}>Profesional</Label>
            <Select
                items={professionalItems}
                value={selectedId !== null ? String(selectedId) : undefined}
                onValueChange={(value) => onSelect(Number(value))}
            >
                <SelectTrigger id={triggerId} className="w-full sm:w-64">
                    <SelectValue placeholder="Seleccioná un profesional" />
                </SelectTrigger>
                <SelectContent>
                    {professionalItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
