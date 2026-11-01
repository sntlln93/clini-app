import type { Control } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { TwoFactorCodeInput } from '@/features/two-factor-code/TwoFactorCodeInput';
import type { DeleteAccountValues } from './delete-account-schema';

type DeleteAccountSecondFactorFieldProps = {
    control: Control<DeleteAccountValues>;
    useRecovery: boolean;
    onToggleRecovery: () => void;
};

/** The second factor's code, or one of its recovery codes, like the login's second step. */
export function DeleteAccountSecondFactorField({
    control,
    useRecovery,
    onToggleRecovery,
}: DeleteAccountSecondFactorFieldProps) {
    return (
        <div className="grid gap-2">
            <FormField
                control={control}
                name="code"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>
                            {useRecovery
                                ? 'Código de recuperación'
                                : 'Código de verificación'}
                        </FormLabel>
                        <FormControl
                            render={
                                useRecovery ? (
                                    <Input
                                        key="recovery"
                                        autoComplete="off"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                        {...field}
                                    />
                                ) : (
                                    <TwoFactorCodeInput key="code" {...field} />
                                )
                            }
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />
            <Button
                type="button"
                variant="ghost"
                className="justify-self-start"
                onClick={onToggleRecovery}
            >
                {useRecovery
                    ? 'Usar el código de la app'
                    : 'Usar un código de recuperación'}
            </Button>
        </div>
    );
}
