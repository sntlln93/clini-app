import { initialsOf } from '@/lib/initials';
import type { Professional } from '@/types/professional';

// One professional's column title, as in the landing's agenda example.
export function AgendaColumnHeader({
    professional,
}: {
    professional: Professional;
}) {
    const name = professional.user.name;

    return (
        <div
            data-column-header
            className="flex min-w-0 items-center gap-2 px-2 pt-2 pb-3 text-xs leading-tight"
        >
            <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-[0.7rem] font-medium text-primary"
            >
                {initialsOf(name)}
            </span>
            <span className="min-w-0 truncate font-medium">{name}</span>
        </div>
    );
}
