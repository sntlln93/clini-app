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
import type { AcceptInvitationFormValues } from './AcceptInvitationForm';

type AcceptInvitationRegistrationFieldsProps = {
    control: Control<AcceptInvitationFormValues>;
};

export function AcceptInvitationRegistrationFields({
    control,
}: AcceptInvitationRegistrationFieldsProps) {
    return (
        <>
            <FormField
                control={control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl
                            render={<Input autoComplete="name" {...field} />}
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl
                            render={
                                <Input
                                    type="password"
                                    autoComplete="new-password"
                                    {...field}
                                />
                            }
                        />
                        <FormDescription>{PASSWORD_HINT}</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

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
        </>
    );
}
