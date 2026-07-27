import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { MembershipRole, MembershipStatus } from '@/types/membership';

const ROLE_OPTIONS: { value: MembershipRole; label: string }[] = [
    { value: 'owner', label: 'Propietario' },
    { value: 'admin', label: 'Administrador' },
    { value: 'professional', label: 'Profesional' },
    { value: 'staff', label: 'Personal' },
];

const STATUS_OPTIONS: { value: MembershipStatus; label: string }[] = [
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' },
    { value: 'suspended', label: 'Suspendido' },
];

type MemberRoleFieldsProps = {
    roles: MembershipRole[];
    onToggleRole: (role: MembershipRole, checked: boolean) => void;
    status?: MembershipStatus;
    onStatusChange?: (status: MembershipStatus) => void;
    errors: Record<string, string>;
};

export function MemberRoleFields({
    roles,
    onToggleRole,
    status,
    onStatusChange,
    errors,
}: MemberRoleFieldsProps) {
    return (
        <>
            <div className="space-y-2">
                <Label>Roles</Label>
                <div className="space-y-1.5">
                    {ROLE_OPTIONS.map((option) => (
                        <label
                            key={option.value}
                            className="flex items-center gap-2 text-sm"
                        >
                            <Checkbox
                                checked={roles.includes(option.value)}
                                onCheckedChange={(checked) =>
                                    onToggleRole(option.value, checked === true)
                                }
                            />
                            {option.label}
                        </label>
                    ))}
                </div>
                {errors.roles && (
                    <p className="text-sm text-destructive">{errors.roles}</p>
                )}
            </div>

            {status && onStatusChange && (
                <div className="space-y-2">
                    <Label htmlFor="member-status">Estado</Label>
                    <Select
                        value={status}
                        onValueChange={(value) =>
                            onStatusChange(value as MembershipStatus)
                        }
                    >
                        <SelectTrigger id="member-status" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.status && (
                        <p className="text-sm text-destructive">
                            {errors.status}
                        </p>
                    )}
                </div>
            )}
        </>
    );
}
