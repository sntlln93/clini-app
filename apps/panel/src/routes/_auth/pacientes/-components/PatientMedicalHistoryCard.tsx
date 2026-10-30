import { useRef, useState } from 'react';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { currentBloodType, entriesOf } from '@/lib/medical-history';
import {
    MEDICAL_HISTORY_CATEGORIES,
    type BloodType,
    type MedicalHistory,
    type MedicalHistoryEntry,
} from '@/types/medical-history';
import { useClinicalWriteAccess } from '../-hooks/use-clinical-write-access';
import { BloodTypeDialog } from './BloodTypeDialog';
import { BloodTypeSection } from './BloodTypeSection';
import {
    MedicalHistoryEntryDialog,
    type MedicalHistoryEntryTarget,
} from './MedicalHistoryEntryDialog';
import { MedicalHistorySection } from './MedicalHistorySection';
import { WithdrawEntryDialog } from './WithdrawEntryDialog';

type PatientMedicalHistoryCardProps = {
    patientId: number;
    history: MedicalHistory;
    todaysAppointmentId: number | null;
};

// The patient's background as every professional of the practice recorded it
// (#361): the blood type, the allergies and the personal, family and surgical
// antecedents. Recorded on today's own appointment; only its author amends an
// entry or withdraws it once it no longer applies.
export function PatientMedicalHistoryCard({
    patientId,
    history,
    todaysAppointmentId,
}: PatientMedicalHistoryCardProps) {
    const access = useClinicalWriteAccess(todaysAppointmentId);
    const [bloodType, setBloodType] = useState<{
        appointmentId: number;
        current: BloodType | null;
    } | null>(null);
    const [editing, setEditing] = useState<MedicalHistoryEntryTarget | null>(
        null,
    );
    const [withdrawing, setWithdrawing] = useState<MedicalHistoryEntry | null>(
        null,
    );
    const contentRef = useRef<HTMLDivElement>(null);
    const appointmentId = access.recordingAppointmentId;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Antecedentes</CardTitle>
                {access.unavailableReason && (
                    <CardDescription>
                        {access.unavailableReason}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent ref={contentRef} tabIndex={-1} className="space-y-6">
                <BloodTypeSection
                    records={history.blood_types}
                    onRecord={
                        appointmentId === null
                            ? null
                            : () =>
                                  setBloodType({
                                      appointmentId,
                                      current:
                                          currentBloodType(history)
                                              ?.blood_type ?? null,
                                  })
                    }
                />
                {MEDICAL_HISTORY_CATEGORIES.map((category) => (
                    <MedicalHistorySection
                        key={category}
                        category={category}
                        entries={entriesOf(history, category)}
                        onRecord={
                            appointmentId === null
                                ? null
                                : () =>
                                      setEditing({
                                          appointmentId,
                                          category,
                                          amending: null,
                                      })
                        }
                        canChange={access.isOwn}
                        onAmend={(entry) =>
                            setEditing({
                                appointmentId: entry.appointment_id,
                                category: entry.category,
                                amending: entry,
                            })
                        }
                        onWithdraw={setWithdrawing}
                    />
                ))}
            </CardContent>
            <BloodTypeDialog
                patientId={patientId}
                target={bloodType}
                onClose={() => setBloodType(null)}
            />
            <MedicalHistoryEntryDialog
                patientId={patientId}
                target={editing}
                onClose={() => setEditing(null)}
            />
            <WithdrawEntryDialog
                patientId={patientId}
                entry={withdrawing}
                onClose={() => setWithdrawing(null)}
                finalFocus={contentRef}
            />
        </Card>
    );
}
