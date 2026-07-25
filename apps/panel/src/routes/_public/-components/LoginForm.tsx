import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { useLogin } from '../-hooks/use-login';

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { mutate, isPending, message, errors } = useLogin();

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        mutate({ email, password });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 text-center">
                <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
                <p className="text-sm text-muted-foreground">
                    Ingresá tus datos para continuar
                </p>
            </div>

            {message && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {message}
                </div>
            )}

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
                    autoComplete="current-password"
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

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Ingresando…' : 'Ingresar'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
                ¿No tenés cuenta?{' '}
                <Link
                    to="/registro"
                    className="font-medium text-foreground underline underline-offset-4"
                >
                    Registrate
                </Link>
            </p>
        </form>
    );
}
