import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouteRetry } from '@/hooks/use-route-retry';
import { mapToAppError } from '@/lib/api-errors';
import { messageForAppError } from '@/lib/error-codes';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
    isRateLimitedError,
    RATE_LIMITED_MESSAGE,
} from '../../-hooks/use-confirm-booking';

/**
 * The patient-facing pages' `errorComponent`: their visitor is a patient, not a member, so it never offers the panel's
 * «Volver»/«Ir al inicio». A business answer (a link that doesn't exist, a practice that isn't taking bookings) can't
 * be fixed by retrying either, so only a failure retrying could fix gets the button.
 */
function PatientErrorState({
    title,
    error,
    reset,
}: ErrorComponentProps & { title: string }) {
    const appError = mapToAppError(error);
    const retry = useRouteRetry(reset);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        containerRef.current?.focus({ preventScroll: true });
    }, []);

    return (
        <Card
            ref={containerRef}
            tabIndex={-1}
            className="w-full max-w-md text-center"
        >
            <CardContent className="flex flex-col items-center gap-4">
                <h1 className="text-xl tracking-tight">{title}</h1>
                <p className="text-muted-foreground">
                    {isRateLimitedError(error)
                        ? RATE_LIMITED_MESSAGE
                        : messageForAppError(appError)}
                </p>
                {appError.kind !== 'business' && (
                    <Button variant="outline" size="sm" onClick={retry}>
                        <RotateCcw data-icon="inline-start" />
                        Reintentar
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

/** The public booking page's. */
export function BookingErrorState(props: ErrorComponentProps) {
    return <PatientErrorState title="Reservar turno" {...props} />;
}

/** The appointment details page's, the one the reminder links to (#320). */
export function AppointmentDetailsErrorState(props: ErrorComponentProps) {
    return <PatientErrorState title="Tu turno" {...props} />;
}
