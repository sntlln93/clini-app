import type { Control } from 'react-hook-form';

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { RegisterFormValues } from './RegisterForm';

type RegisterFormFieldsProps = {
    control: Control<RegisterFormValues>;
};

export function RegisterFormFields({ control }: RegisterFormFieldsProps) {
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
                name="organization_name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nombre del consultorio</FormLabel>
                        <FormControl
                            render={
                                <Input autoComplete="organization" {...field} />
                            }
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Correo electrónico</FormLabel>
                        <FormControl
                            render={
                                <Input
                                    type="email"
                                    autoComplete="email"
                                    {...field}
                                />
                            }
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
