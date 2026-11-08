import { useProgressMessages } from '@/hooks/use-progress-messages';

// What a lookup in the national registry actually goes through (#380): it
// reads the Buscador's form, sends the DNI and brings the licenses it holds
// for it (#387). The last line only shows when it takes longer than its
// steps.
export const REGISTRY_PROGRESS_MESSAGES = [
    'Conectando con el Buscador Nacional de Profesionales de la Salud',
    'Buscando tu DNI en el registro',
    'Trayendo las matrículas que figuran en el registro',
    'El Buscador está tardando un poco más de lo normal',
] as const;

const STEP_MS = 1400;

/**
 * How long a lookup's answer waits, at least: every step but the slow notice
 * gets its turn (the third one 1.2s), so a quick answer doesn't cut them.
 */
export const REGISTRY_PROGRESS_MIN_MS = 2 * STEP_MS + 1200;

/** Mounted only while a lookup runs, so each one starts from its first step. */
export function RegistryProgress() {
    const message = useProgressMessages(REGISTRY_PROGRESS_MESSAGES, STEP_MS);

    return (
        <p role="status" className="text-sm text-muted-foreground">
            {message}
        </p>
    );
}
