import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MembershipRole } from '@/types/membership';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { useInviteMember } from '../-hooks/use-invite-member';
import { MemberRoleFields } from './MemberRoleFields';

export function MemberInviteForm() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [roles, setRoles] = useState<MembershipRole[]>([]);
    const { mutate, isPending, message, errors } = useInviteMember();

    function toggleRole(role: MembershipRole, checked: boolean) {
        setRoles((previous) =>
            checked
                ? [...previous, role]
                : previous.filter((current) => current !== role),
        );
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        mutate(
            { email, roles },
            { onSuccess: () => navigate({ to: '/profesionales' }) },
        );
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
            {message && <p className="text-sm text-destructive">{message}</p>}

            <div className="space-y-2">
                <Label htmlFor="invite-email">Correo electrónico</Label>
                <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                />
                {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                )}
            </div>

            <MemberRoleFields
                roles={roles}
                onToggleRole={toggleRole}
                errors={errors}
            />

            <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Enviando…' : 'Enviar invitación'}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    render={<Link to="/profesionales" />}
                    nativeButton={false}
                >
                    Cancelar
                </Button>
            </div>
        </form>
    );
}
