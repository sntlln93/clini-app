import type { Appointment } from '@/types/appointment';
import type { Professional } from '@/types/professional';
import { ProfessionalQueueCard } from './ProfessionalQueueCard';
import { buildWaitingQueues } from './waiting-room';

export type WaitingRoomBoardProps = {
    professionals: Professional[];
    appointments: Appointment[];
    /** When the data was read (ms epoch), the reference for waiting times. */
    updatedAt: number;
};

export function WaitingRoomBoard({
    professionals,
    appointments,
    updatedAt,
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
                    now={updatedAt}
                />
            ))}
        </div>
    );
}
