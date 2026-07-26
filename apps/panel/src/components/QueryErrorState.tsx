import { cn } from '@/lib/utils';
import axios from 'axios';

type QueryErrorStateProps = {
    error: unknown;
    className?: string;
};

const NO_ORGANIZATION_MESSAGE =
    'Tu cuenta no tiene una organización activa. Pedí acceso a un administrador para ver los pacientes.';

const GENERIC_MESSAGE = 'No pudimos cargar la información. Intentá nuevamente.';

function messageFor(error: unknown): string {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
        return NO_ORGANIZATION_MESSAGE;
    }

    return GENERIC_MESSAGE;
}

/**
 * Shared presentational error state for failed TanStack Query reads.
 * No domain logic, no data fetching — just message selection + styling.
 */
export function QueryErrorState({ error, className }: QueryErrorStateProps) {
    return (
        <p className={cn('text-sm text-destructive', className)}>
            {messageFor(error)}
        </p>
    );
}
