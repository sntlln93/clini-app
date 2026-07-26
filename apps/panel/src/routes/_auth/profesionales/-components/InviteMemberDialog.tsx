import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MembershipRole } from '@/types/membership';
import { useState, type FormEvent } from 'react';
import { useInviteMember } from '../-hooks/use-invite-member';
import { MemberRoleFields } from './MemberRoleFields';

export function InviteMemberDialog() {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [roles, setRoles] = useState<MembershipRole[]>([]);
    const { mutate, isPending, isSuccess, message, errors, reset } =
        useInviteMember();

    function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen);

        if (!nextOpen) {
            setEmail('');
            setRoles([]);
            reset();
        }
    }

    function toggleRole(role: MembershipRole, checked: boolean) {
        setRoles((previous) =>
            checked
                ? [...previous, role]
                : previous.filter((current) => current !== role),
        );
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        mutate({ email, roles });
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={<Button />}>Invitar miembro</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invitar miembro</DialogTitle>
                    <DialogDescription>
                        Se enviará un correo de invitación con los roles
                        elegidos.
                    </DialogDescription>
                </DialogHeader>

                {isSuccess ? (
                    <div className="space-y-4">
                        <p className="text-sm text-foreground">
                            Invitación enviada correctamente.
                        </p>
                        <DialogFooter>
                            <Button
                                type="button"
                                onClick={() => handleOpenChange(false)}
                            >
                                Cerrar
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {message && (
                            <p className="text-sm text-destructive">
                                {message}
                            </p>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="invite-email">
                                Correo electrónico
                            </Label>
                            <Input
                                id="invite-email"
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                required
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <MemberRoleFields
                            roles={roles}
                            onToggleRole={toggleRole}
                            errors={errors}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Enviando…' : 'Enviar invitación'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
