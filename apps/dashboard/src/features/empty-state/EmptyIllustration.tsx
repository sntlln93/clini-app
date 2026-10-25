import { cn } from '@/lib/utils';
import type { ReactElement } from 'react';
import {
    InboxScene,
    OrganizationsScene,
    PaymentsScene,
    RecordsScene,
    SearchScene,
} from './record-scenes';
import {
    AgendaDayScene,
    AgendaWeekScene,
    PatientsScene,
    TeamScene,
} from './scheduling-scenes';

const SCENES = {
    agenda_day: AgendaDayScene,
    agenda_week: AgendaWeekScene,
    team: TeamScene,
    patients: PatientsScene,
    search: SearchScene,
    records: RecordsScene,
    inbox: InboxScene,
    organizations: OrganizationsScene,
    payments: PaymentsScene,
} satisfies Record<string, () => ReactElement>;

export type EmptyIllustrationName = keyof typeof SCENES;

/** The scene on the error pages' glow, telling what the list is waiting for. Decorative: the title says it in words. */
export function EmptyIllustration({
    name,
    className,
}: {
    name: EmptyIllustrationName;
    className?: string;
}) {
    const Scene = SCENES[name];

    return (
        <svg
            viewBox="0 0 240 200"
            aria-hidden="true"
            focusable="false"
            data-illustration={name}
            className={cn('h-auto', className)}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx={120} cy={100} r={96} className="fill-glow" />
            <ellipse
                cx={114}
                cy={156}
                rx={74}
                ry={8}
                className="fill-accent opacity-70"
            />
            <Scene />
        </svg>
    );
}
