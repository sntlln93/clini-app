import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { useRegister } from '../-hooks/use-register';

export function RegisterForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const { mutate, isPending, message, errors } = useRegister();

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        mutate({
            name,
            email,
            organization_name: organizationName,
            password,
            password_confirmation: passwordConfirmation,
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 text-center">
                <h1 className="text-2xl font-semibold">Crear cuenta</h1>
                <p className="text-sm text-muted-foreground">
                    Registrá tu consultorio en Clini
                </p>
            </div>

            {message && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {message}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                    id="name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="organization_name">
                    Nombre del consultorio
                </Label>
                <Input
                    id="organization_name"
                    autoComplete="organization"
                    value={organizationName}
                    onChange={(event) =>
                        setOrganizationName(event.target.value)
                    }
                    required
                />
                {errors.organization_name && (
                    <p className="text-sm text-destructive">
                        {errors.organization_name}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                />
                {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
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
                        setPasswordConfirmation(event.target.value)
                    }
                    required
                />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Creando cuenta…' : 'Crear cuenta'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
                ¿Ya tenés cuenta?{' '}
                <Link
                    to="/login"
                    className="font-medium text-foreground underline underline-offset-4"
                >
                    Iniciá sesión
                </Link>
            </p>
        </form>
    );
}
