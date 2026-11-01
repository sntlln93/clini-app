import { useProgressMessages } from '@/hooks/use-progress-messages';

// What a lookup in the national registry actually goes through (#380): it
// reads the Buscador's form, sends the DNI and compares the answer with the
// declared licenses. The last line stays until it ends.
export const REGISTRY_PROGRESS_MESSAGES = [
    'Conectando con el Buscador Nacional de Profesionales de la Salud…',
    'Buscando tu DNI en el registro…',
    'Comparando tus matrículas con lo que figura en el registro…',
    'El Buscador está tardando un poco más de lo normal…',
] as const;

/** Mounted only while a lookup runs, so each one starts from its first step. */
export function RegistryProgress() {
    const message = useProgressMessages(REGISTRY_PROGRESS_MESSAGES, 2500);

    return (
        <p role="status" className="text-sm text-muted-foreground">
            {message}
        </p>
    );
}
