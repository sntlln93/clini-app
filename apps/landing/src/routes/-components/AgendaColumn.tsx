import { APPOINTMENT_TONES } from '@/lib/appointment-status';
import { cn } from '@/lib/utils';
import { NOW, heightFor, offsetFor, type MockAppointment } from './agenda-data';

type AgendaColumnProps = {
    appointments: MockAppointment[];
    showNow: boolean;
};

export function AgendaColumn({ appointments, showNow }: AgendaColumnProps) {
    return (
        <div className="relative h-108 bg-[repeating-linear-gradient(to_bottom,transparent_0_71px,var(--border)_71px_72px)]">
            {showNow && (
                <div
                    aria-hidden="true"
                    style={{ top: offsetFor(NOW) }}
                    className="absolute inset-x-0 z-2 border-t-2 border-destructive before:absolute before:-top-1.25 before:-left-1 before:size-2 before:rounded-full before:bg-destructive"
                />
            )}
            {appointments.map((appointment) => {
                const tone = APPOINTMENT_TONES[appointment.tone];
                return (
                    <div
                        key={appointment.patient}
                        style={{
                            top: offsetFor(appointment.start) + 4,
                            height: heightFor(appointment.minutes) - 8,
                        }}
                        className={cn(
                            'absolute inset-x-1 overflow-hidden rounded-xl border-l-[3px] px-2.5 py-1.5 text-xs leading-tight',
                            tone.block,
                            appointment.isNew &&
                                'animate-in shadow-lg ring-2 ring-status-online delay-700 duration-900 fill-mode-both slide-in-from-top-3',
                        )}
                    >
                        <b className="block font-medium">
                            {appointment.patient}
                        </b>
                        <span className="text-muted-foreground">
                            {appointment.reason}
                        </span>
                        <span
                            className={cn(
                                'mt-1 flex w-fit items-center gap-1 rounded-full bg-card px-1.5 py-0.5 text-[0.65rem] font-medium',
                                tone.text,
                            )}
                        >
                            <span
                                className={cn(
                                    'size-1.5 rounded-full',
                                    tone.dot,
                                )}
                            />
                            {tone.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
