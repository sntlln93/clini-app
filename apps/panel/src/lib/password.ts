import { z } from 'zod';

/** Mirrors the API's `Password::defaults()` (#389): its other half, a password no known breach holds, only the API can check. */
export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_HINT = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`;

export const PASSWORD_TOO_SHORT_MESSAGE = `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;

export const PASSWORDS_DIFFER_MESSAGE = 'Las contraseñas no coinciden.';

/** A password being chosen: registering, accepting an invitation, changing or resetting it. */
export const newPasswordSchema = z
    .string()
    .min(1, 'La contraseña es obligatoria.')
    .min(PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE);

export const passwordConfirmationSchema = z
    .string()
    .min(1, 'Confirmá tu contraseña.');
