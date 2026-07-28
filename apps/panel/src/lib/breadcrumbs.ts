export type Breadcrumb = { label: string; href?: string };

const HOME_CRUMB: Breadcrumb = { label: 'Inicio', href: '/' };

const SEGMENT_LABELS: Record<string, string> = {
    agenda: 'Agenda',
    pacientes: 'Pacientes',
    profesionales: 'Profesionales',
    disponibilidad: 'Disponibilidad',
    ajustes: 'Ajustes',
    test: 'Test',
    nuevo: 'Nuevo',
    editar: 'Editar',
};

const SECTION_SEGMENT_LABELS: Record<string, Record<string, string>> = {
    pacientes: {
        nuevo: 'Nuevo paciente',
        editar: 'Editar paciente',
    },
};

function capitalize(segment: string): string {
    return segment.charAt(0).toUpperCase() + segment.slice(1);
}

function labelFor(segment: string, section: string | undefined): string {
    const sectionLabels = section ? SECTION_SEGMENT_LABELS[section] : undefined;

    return (
        sectionLabels?.[segment] ??
        SEGMENT_LABELS[segment] ??
        capitalize(segment)
    );
}

/** Dynamic route params (e.g. a patient id) are purely numeric segments. */
function isDynamicIdSegment(segment: string): boolean {
    return /^\d+$/.test(segment);
}

export function buildBreadcrumbs(pathname: string): Breadcrumb[] {
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length === 0) {
        return [{ label: HOME_CRUMB.label }];
    }

    const section = segments[0];
    const crumbs: Breadcrumb[] = [HOME_CRUMB];
    let href = '';

    for (const segment of segments) {
        href += `/${segment}`;

        if (isDynamicIdSegment(segment)) {
            continue;
        }

        crumbs.push({ label: labelFor(segment, section), href });
    }

    const last = crumbs[crumbs.length - 1];
    if (last) {
        last.href = undefined;
    }

    return crumbs;
}
