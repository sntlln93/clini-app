import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ReasonDialog } from '@/features/reason-dialog/ReasonDialog';
import type { VitalSign } from '@/types/vital-sign';
import { useClinicalWriteAccess } from '../-hooks/use-clinical-write-access';
import { useAnnulVitalSign } from '../-hooks/use-patient-vital-signs';
import { LatestVitalSigns } from './LatestVitalSigns';
import { RecordActions } from './RecordActions';
import { VitalSignDialog } from './VitalSignDialog';
import { VitalSignEntry } from './VitalSignEntry';
import { VitalSignsEvolution } from './VitalSignsEvolution';

type PatientVitalSignsCardProps = {
    patientId: number;
    vitalSigns: VitalSign[];
    todaysAppointmentId: number | null;
};

// The measurements every professional of the practice took on this patient
// (#361), part of the clinical history: each value's latest reading, the
// evolution of the followed ones and every measurement with its versions.
// One is recorded on today's own appointment; only its author amends it or
// annuls it with a reason.
export function PatientVitalSignsCard({
    patientId,
    vitalSigns,
    todaysAppointmentId,
}: PatientVitalSignsCardProps) {
    const access = useClinicalWriteAccess(todaysAppointmentId);
    const annul = useAnnulVitalSign(patientId);
    const [editing, setEditing] = useState<{
        appointmentId: number;
        amending: VitalSign | null;
    } | null>(null);
    const [annulling, setAnnulling] = useState<VitalSign | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const recordingAppointmentId = access.recordingAppointmentId;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mediciones</CardTitle>
                {access.unavailableReason && (
                    <CardDescription>
                        {access.unavailableReason}
                    </CardDescription>
                )}
                {recordingAppointmentId !== null && (
                    <CardAction>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                                setEditing({
                                    appointmentId: recordingAppointmentId,
                                    amending: null,
                                })
                            }
                        >
                            Registrar medición
                        </Button>
                    </CardAction>
                )}
            </CardHeader>
            <CardContent ref={listRef} tabIndex={-1} className="space-y-6">
                {vitalSigns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Todavía no hay mediciones de este paciente.
                    </p>
                ) : (
                    <>
                        <LatestVitalSigns vitalSigns={vitalSigns} />
                        <VitalSignsEvolution vitalSigns={vitalSigns} />
                        <section aria-label="Todas las mediciones">
                            <h3 className="mb-2 text-sm font-medium">
                                Todas las mediciones
                            </h3>
                            <ul className="space-y-3">
                                {vitalSigns.map((vitalSign) => (
                                    <VitalSignEntry
                                        key={vitalSign.id}
                                        vitalSign={vitalSign}
                                        actions={
                                            access.isOwn(vitalSign) &&
                                            vitalSign.annulment === null && (
                                                <RecordActions
                                                    endLabel="Anular"
                                                    onAmend={() =>
                                                        setEditing({
                                                            appointmentId:
                                                                vitalSign.appointment_id,
                                                            amending: vitalSign,
                                                        })
                                                    }
                                                    onEnd={() =>
                                                        setAnnulling(vitalSign)
                                                    }
                                                />
                                            )
                                        }
                                    />
                                ))}
                            </ul>
                        </section>
                    </>
                )}
            </CardContent>
            <VitalSignDialog
                patientId={patientId}
                target={editing}
                onClose={() => setEditing(null)}
            />
            <ReasonDialog
                open={annulling !== null}
                onOpenChange={(next) => !next && setAnnulling(null)}
                finalFocus={listRef}
                title="Anular medición"
                description="La medición sale de la evolución y queda en la historia clínica, marcada como anulada junto con el motivo. No se puede deshacer."
                submitLabel="Anular medición"
                onSubmit={(reason) =>
                    annulling === null
                        ? Promise.resolve()
                        : annul.mutateAsync({ id: annulling.id, reason })
                }
            />
        </Card>
    );
}
