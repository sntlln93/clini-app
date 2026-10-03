import type { Appointment } from '@/types/appointment';
import type { Professional } from '@/types/professional';
import { ProfessionalQueueCard } from './ProfessionalQueueCard';
import { buildWaitingQueues } from './waiting-room';

export type WaitingRoomBoardProps = {
    professionals: Professional[];
    appointments: Appointment[];
};

export function WaitingRoomBoard({
    professionals,
    appointments,
}: WaitingRoomBoardProps) {
    if (professionals.length === 0) {
        return (
            <p className="text-xl text-muted-foreground">
                Todavía no hay profesionales en esta organización.
            </p>
        );
    }

    const queues = buildWaitingQueues(professionals, appointments);

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {queues.map((queue) => (
                <ProfessionalQueueCard
                    key={queue.professional.id}
                    queue={queue}
                />
            ))}
        </div>
    );
}
