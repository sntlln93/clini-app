import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query';
import type { Availability } from '@/types/availability';
import { CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { useReplaceWeeklyAvailability } from '../-hooks/use-availabilities';
import type { AvailabilityReadOnlyReason } from '../-hooks/use-availability-permissions';
import { useWeekDraft } from '../-hooks/use-week-draft';
import { AvailabilityReadOnlyNote } from './AvailabilityReadOnlyNote';
import { DayPanel } from './DayPanel';
import { MobileWeek } from './MobileWeek';
import { saveErrorMessages } from './save-errors';
import { SaveBar } from './SaveBar';
import { UnsavedChangesGuard } from './UnsavedChangesGuard';
import { toSlotsPayload, type WeekDraft } from './week-draft';
import { DISPLAY_ORDER } from './week-labels';
import { WeekGrid } from './WeekGrid';

type WeeklyScheduleProps = {
    membershipId: number;
    heading: string;
    canManage: boolean;
    readOnlyReason: AvailabilityReadOnlyReason | null;
    slots: Availability[];
};

function firstDayWithRanges(week: WeekDraft): number {
    return DISPLAY_ORDER.find((day) => week[day].length > 0) ?? 1;
}

/** "Semana habitual": the week is edited as a draft and saved as a whole. */
export function WeeklySchedule({
    membershipId,
    heading,
    canManage,
    readOnlyReason,
    slots,
}: WeeklyScheduleProps) {
    const isDesktop = useMediaQuery(DESKTOP_QUERY);
    const draft = useWeekDraft(slots);
    const save = useReplaceWeeklyAvailability(membershipId);
    const [selectedDay, setSelectedDay] = useState(() =>
        firstDayWithRanges(draft.week),
    );
    const errors =
        save.error && save.variables
            ? saveErrorMessages(save.error, save.variables)
            : [];

    function discard() {
        draft.discard();
        save.reset();
    }

    const editorProps = {
        week: draft.week,
        selectedDay,
        canManage,
        onSelectDay: setSelectedDay,
        actions: draft,
    };

    return (
        <section aria-labelledby="weekly-heading" className="space-y-4">
            <div className="space-y-1">
                <h2 id="weekly-heading" className="text-lg font-medium">
                    {heading}
                </h2>
                {canManage && (
                    <p className="text-sm text-muted-foreground">
                        {isDesktop
                            ? 'Arrastrá sobre un día para crear una franja; mové los bloques o ajustá sus bordes. También podés editarlas desde el panel del día.'
                            : 'Elegí un día y tocá una franja para editarla.'}
                    </p>
                )}
            </div>

            {readOnlyReason && (
                <AvailabilityReadOnlyNote reason={readOnlyReason} />
            )}

            {isDesktop ? (
                <div className="grid grid-cols-[minmax(0,1fr)_20rem] gap-6">
                    <div className="min-w-0 rounded-3xl border p-4">
                        <WeekGrid {...editorProps} />
                    </div>
                    <div className="self-start rounded-3xl border p-4">
                        <DayPanel
                            day={selectedDay}
                            ranges={draft.week[selectedDay]}
                            canManage={canManage}
                            actions={draft}
                        />
                    </div>
                </div>
            ) : (
                <MobileWeek {...editorProps} />
            )}

            {errors.length > 0 && (
                <Alert variant="destructive">
                    <CircleAlert aria-hidden />
                    <AlertTitle>No se pudieron guardar los horarios</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc pl-4">
                            {errors.map((message) => (
                                <li key={message}>{message}</li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            <SaveBar
                canManage={canManage}
                isDirty={draft.isDirty}
                isSaving={save.isPending}
                onSave={() => save.mutate(toSlotsPayload(draft.week))}
                onDiscard={discard}
            />

            <UnsavedChangesGuard when={draft.isDirty} />
        </section>
    );
}
