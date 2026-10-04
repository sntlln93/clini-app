export type Breadcrumb = { label: string; href?: string };

// `/` only redirects to the agenda, so the agenda is the real root of the trail.
const ROOT_SECTION = 'agenda';
const ROOT_CRUMB: Breadcrumb = { label: 'Agenda', href: '/agenda' };

const SEGMENT_LABELS: Record<string, string> = {
    agenda: 'Agenda',
    'sala-de-espera': 'Sala de espera',
    recetas: 'Recetas',
    pacientes: 'Pacientes',
    profesionales: 'Profesionales',
    disponibilidad: 'Disponibilidad',
    ajustes: 'Ajustes',
    nuevo: 'Nuevo',
    editar: 'Editar',
};

const SECTION_SEGMENT_LABELS: Record<string, Record<string, string>> = {
    pacientes: {
        nuevo: 'Nuevo paciente',
        editar: 'Editar paciente',
    },
    profesionales: {
        nuevo: 'Invitar miembro',
        editar: 'Editar miembro',
    },
};

// Sections whose numeric id segment has a detail route of its own; elsewhere
// (e.g. `recetas`, or `profesionales/$id/editar`) the id is skipped, since
// linking it would point at a route that doesn't exist.
const SECTIONS_WITH_DETAIL = new Set(['pacientes']);

const DETAIL_CRUMB_LABEL = 'Ficha';

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
        return [{ label: ROOT_CRUMB.label }];
    }

    const section = segments[0];
    const crumbs: Breadcrumb[] =
        section === ROOT_SECTION ? [] : [{ ...ROOT_CRUMB }];
    let href = '';

    for (const segment of segments) {
        href += `/${segment}`;

        if (isDynamicIdSegment(segment)) {
            if (section && SECTIONS_WITH_DETAIL.has(section)) {
                crumbs.push({ label: DETAIL_CRUMB_LABEL, href });
            }
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
