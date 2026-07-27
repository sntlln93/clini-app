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
    return (
        <Select
            value={selectedId !== null ? String(selectedId) : undefined}
            onValueChange={(value) => onSelect(Number(value))}
        >
            <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Seleccioná un profesional" />
            </SelectTrigger>
            <SelectContent>
                {professionals.map((membership) => (
                    <SelectItem
                        key={membership.id}
                        value={String(membership.id)}
                    >
                        {membership.user.name ?? membership.user.email}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
