import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AcceptInvitationRegistrationFieldsProps = {
    name: string;
    onNameChange: (value: string) => void;
    password: string;
    onPasswordChange: (value: string) => void;
    passwordConfirmation: string;
    onPasswordConfirmationChange: (value: string) => void;
    errors: Record<string, string>;
};

export function AcceptInvitationRegistrationFields({
    name,
    onNameChange,
    password,
    onPasswordChange,
    passwordConfirmation,
    onPasswordConfirmationChange,
    errors,
}: AcceptInvitationRegistrationFieldsProps) {
    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                    id="name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => onNameChange(event.target.value)}
                    required
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    required
                />
                {errors.password && (
                    <p className="text-sm text-destructive">
                        {errors.password}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="password_confirmation">
                    Confirmar contraseña
                </Label>
                <Input
                    id="password_confirmation"
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirmation}
                    onChange={(event) =>
                        onPasswordConfirmationChange(event.target.value)
                    }
                    required
                />
            </div>
        </>
    );
}
