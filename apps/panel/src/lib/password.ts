/** Mirrors the backend's `min:8` on `RegisterRequest` and `AcceptInvitationRequest`. */
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_HINT = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`;

export const PASSWORD_TOO_SHORT_MESSAGE = `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
