import { z } from 'zod';

export type DeleteAccountValues = { password: string; code: string };

const password = z.string().min(1, 'Ingresá tu contraseña.');

/** The code is asked only with the second factor on; its shape follows the kind the user picked. */
export function deleteAccountSchema(
    twoFactorEnabled: boolean,
    useRecovery: boolean,
) {
    if (!twoFactorEnabled) {
        return z.object({ password, code: z.string() });
    }

    return z.object({
        password,
        code: useRecovery
            ? z.string().trim().min(1, 'Ingresá un código de recuperación.')
            : z
                  .string()
                  .trim()
                  .regex(/^\d{6}$/, 'El código tiene 6 números.'),
    });
}
