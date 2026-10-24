import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { CLINICAL_ACCESS_WINDOW_DAYS } from '@/lib/clinical-access';
import { useState } from 'react';
import { useDeclareExceptionalAccess } from '../-hooks/use-clinical-history';
import { ExceptionalAccessDialog } from './ExceptionalAccessDialog';

export const NO_ACCESS_REASON =
    'Solo pueden ver las notas clínicas los profesionales que tienen o tuvieron un turno con este paciente.';

export const REASON_REQUIRED_DESCRIPTION = `No tenés un turno con este paciente en los ${CLINICAL_ACCESS_WINDOW_DAYS} días anteriores ni en los ${CLINICAL_ACCESS_WINDOW_DAYS} siguientes. Para ver sus notas clínicas y la medicación que indicaste, contá el motivo.`;

type ClinicalHistoryAccessCardProps = {
    patientId: number;
    access: 'denied' | 'reason_required';
};

// Takes the place of the notes and the medication while the history is closed
// to the acting membership (#325): for good, or until it gives a reason.
export function ClinicalHistoryAccessCard({
    patientId,
    access,
}: ClinicalHistoryAccessCardProps) {
    const [open, setOpen] = useState(false);
    const declare = useDeclareExceptionalAccess(patientId);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historia clínica</CardTitle>
                <CardDescription>
                    {access === 'denied'
                        ? NO_ACCESS_REASON
                        : REASON_REQUIRED_DESCRIPTION}
                </CardDescription>
                {access === 'reason_required' && (
                    <CardAction>
                        <ExceptionalAccessDialog
                            open={open}
                            onOpenChange={setOpen}
                            onSubmit={(payload) => declare.mutateAsync(payload)}
                            trigger={
                                <Button type="button" size="sm">
                                    Indicar motivo
                                </Button>
                            }
                        />
                    </CardAction>
                )}
            </CardHeader>
        </Card>
    );
}
