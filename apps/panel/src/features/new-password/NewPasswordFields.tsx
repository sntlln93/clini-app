import { useFormContext } from 'react-hook-form';

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

export type NewPasswordValues = {
    password: string;
    password_confirmation: string;
};

/** The password being chosen and its confirmation, inside a `Form` whose values include both (#389). */
export function NewPasswordFields() {
    const { control } = useFormContext<NewPasswordValues>();

    return (
        <>
            <FormField
                control={control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Contraseña nueva</FormLabel>
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
                        <FormLabel>Repetí la contraseña nueva</FormLabel>
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
