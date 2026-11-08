import type { Control } from 'react-hook-form';

import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PASSWORD_HINT } from '@/lib/password';
import type { InvitationIdentity } from '../-hooks/use-accept-invitation';

export type InvitationAccountValues = {
    password: string;
    password_confirmation: string;
    code: string;
};

type InvitationAccountFieldsProps = {
    control: Control<InvitationAccountValues>;
    account: InvitationIdentity['account'];
};

// A new account chooses its password; an existing one proves it is the
// invitee's with its own, and its second factor when it has one (#417).
export function InvitationAccountFields({
    control,
    account,
}: InvitationAccountFieldsProps) {
    return (
        <>
            <FormField
                control={control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            {account ? 'Contraseña de tu cuenta' : 'Contraseña'}
                        </FormLabel>
                        <FormControl
                            render={
                                <Input
                                    type="password"
                                    autoComplete={
                                        account
                                            ? 'current-password'
                                            : 'new-password'
                                    }
                                    {...field}
                                />
                            }
                        />
                        {!account && (
                            <FormDescription>{PASSWORD_HINT}</FormDescription>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />

            {!account && (
                <FormField
                    control={control}
                    name="password_confirmation"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirmar contraseña</FormLabel>
                            <FormControl
                                render={
                                    <Input
                                        type="password"
                                        autoComplete="new-password"
                                        {...field}
                                    />
                                }
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {account?.two_factor && (
                <FormField
                    control={control}
                    name="code"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Código de verificación</FormLabel>
                            <FormControl
                                render={
                                    <Input
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        {...field}
                                    />
                                }
                            />
                            <FormDescription>
                                El que muestra tu app de autenticación.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </>
    );
}
