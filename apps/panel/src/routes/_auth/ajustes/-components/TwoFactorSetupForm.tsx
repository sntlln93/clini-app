import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { applyFormErrors, extractFormErrors } from '@/lib/form-errors';
import type { TwoFactorSetup } from '../-hooks/use-two-factor';

const codeSchema = z.object({
    code: z
        .string()
        .trim()
        .regex(/^\d{3} ?\d{3}$/, 'El código tiene 6 números.'),
});

type CodeValues = z.infer<typeof codeSchema>;

type TwoFactorSetupFormProps = {
    setup: TwoFactorSetup;
    onCancel: () => void;
    onConfirm: (code: string) => Promise<unknown>;
};

/** Scanning the QR code (or typing the secret) into an authenticator app, then proving it with a code. */
export function TwoFactorSetupForm({
    setup,
    onCancel,
    onConfirm,
}: TwoFactorSetupFormProps) {
    const form = useForm<CodeValues>({
        resolver: zodResolver(codeSchema),
        defaultValues: { code: '' },
    });

    async function submit({ code }: CodeValues) {
        try {
            await onConfirm(code);
        } catch (error) {
            applyFormErrors(
                form,
                extractFormErrors(error, {
                    'auth.two_factor_code_invalid': 'code',
                }),
                { code: 'code' },
            );
        }
    }

    const isSubmitting = form.formState.isSubmitting;
    const qrSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qr_code_svg)}`;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="grid gap-4">
                <p className="text-sm text-muted-foreground">
                    Escaneá el código con tu app de autenticación (por ejemplo
                    Google Authenticator, Microsoft Authenticator o 1Password).
                    Si no podés escanearlo, cargá la clave a mano.
                </p>
                <img
                    src={qrSrc}
                    alt="Código QR para agregar la cuenta a tu app de autenticación"
                    width={192}
                    height={192}
                    // The QR needs its light background in both themes to scan.
                    className="mx-auto rounded-xl bg-white p-2"
                />
                <div className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Clave</span>
                    <code className="font-mono break-all">{setup.secret}</code>
                </div>
                {form.formState.errors.root && (
                    <p role="alert" className="text-sm text-destructive">
                        {form.formState.errors.root.message}
                    </p>
                )}
                <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Código de verificación</FormLabel>
                            <FormControl
                                render={
                                    <Input
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={7}
                                        {...field}
                                    />
                                }
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Spinner data-icon="inline-start" />}
                        Activar
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
