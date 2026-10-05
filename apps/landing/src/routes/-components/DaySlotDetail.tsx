import { APPOINTMENT_TONES } from '@/lib/appointment-status';
import { cn } from '@/lib/utils';
import { Fragment } from 'react';
import type { SlotDetail } from './day-slots';

export function DaySlotDetail({ detail }: { detail: SlotDetail }) {
    return (
        <div className="grid min-w-0 content-start gap-2.5 rounded-2xl bg-secondary p-4 text-sm">
            {detail.heading && (
                <span className="text-muted-foreground">{detail.heading}</span>
            )}
            {detail.field && (
                <div className="grid grid-cols-[auto_1fr] overflow-hidden rounded-full border tabular-nums">
                    <span className="bg-accent px-3.5 py-2 font-medium text-primary">
                        {detail.field.label}
                    </span>
                    <span className="px-3.5 py-2">{detail.field.value}</span>
                </div>
            )}
            {detail.steps && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {detail.steps.map((step, index) => (
                        <Fragment key={step.label}>
                            {index > 0 && (
                                <span
                                    aria-hidden="true"
                                    className="text-muted-foreground"
                                >
                                    →
                                </span>
                            )}
                            <span
                                aria-current={step.current ? 'step' : undefined}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
                                    step.tone
                                        ? cn(
                                              'border-transparent font-medium',
                                              APPOINTMENT_TONES[step.tone].pill,
                                          )
                                        : step.current &&
                                              'border-primary bg-primary text-primary-foreground',
                                    step.tone &&
                                        step.current &&
                                        'ring-2 ring-current',
                                )}
                            >
                                {step.tone && (
                                    <span
                                        className={cn(
                                            'size-1.5 rounded-full',
                                            APPOINTMENT_TONES[step.tone].dot,
                                        )}
                                    />
                                )}
                                {step.label}
                            </span>
                        </Fragment>
                    ))}
                </div>
            )}
            {detail.rows?.map(([label, value]) => (
                <div
                    key={label}
                    className="flex flex-wrap justify-between gap-x-4"
                >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="tabular-nums">{value}</span>
                </div>
            ))}
            {detail.legal && (
                <p className="rounded-lg bg-destructive-wash px-3 py-2 text-xs text-destructive">
                    {detail.legal}
                </p>
            )}
        </div>
    );
}
