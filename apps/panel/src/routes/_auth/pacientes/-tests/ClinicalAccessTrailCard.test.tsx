import { describeTrailEntry } from '@/lib/clinical-access';
import { formatShortDateTime } from '@/lib/datetime';
import type { ClinicalAccessTrailEntry } from '@/types/clinical-access';
import type { Paginated } from '@/types/pagination';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClinicalAccessTrailCard } from '../-components/ClinicalAccessTrailCard';

function buildEntry(
    overrides: Partial<ClinicalAccessTrailEntry> = {},
): ClinicalAccessTrailEntry {
    return {
        id: 1,
        created_at: '2026-10-20T13:30:00Z',
        action: 'notes_viewed',
        professional: { membership_id: 4, name: 'Dra. Carla Ruiz' },
        reason: null,
        appointment: null,
        clinical_note_id: null,
        prescription_id: null,
        vital_sign_id: null,
        blood_type_record_id: null,
        medical_history_entry_id: null,
        export: null,
        ...overrides,
    };
}

function page(
    data: ClinicalAccessTrailEntry[],
    meta: Partial<Paginated<ClinicalAccessTrailEntry>['meta']> = {},
): Paginated<ClinicalAccessTrailEntry> {
    return {
        data,
        meta: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: data.length,
            ...meta,
        },
        links: { first: null, last: null, prev: null, next: null },
    };
}

describe('describeTrailEntry', () => {
    it('words each action as the exported PDF does', () => {
        expect(describeTrailEntry(buildEntry())).toBe(
            'Leyó las notas clínicas',
        );
        expect(
            describeTrailEntry(
                buildEntry({ action: 'exceptional_access', reason: 'other' }),
            ),
        ).toBe('Acceso excepcional · Motivo: Otro');
    });

    it('says which appointment a note was written on', () => {
        expect(
            describeTrailEntry(
                buildEntry({
                    action: 'note_amended',
                    appointment: { id: 7, start_at: '2026-10-01T13:00:00Z' },
                }),
            ),
        ).toBe(
            `Enmendó una nota · Turno del ${formatShortDateTime('2026-10-01T13:00:00Z')}`,
        );
    });

    it('says the format of an export, and when it held every attended patient', () => {
        const exported = (scope: 'patient' | 'attended_patients') =>
            buildEntry({
                action: 'record_exported',
                export: { id: 3, scope, format: 'json' },
            });

        expect(describeTrailEntry(exported('patient'))).toBe(
            'Exportó la historia clínica · JSON',
        );
        expect(describeTrailEntry(exported('attended_patients'))).toBe(
            'Exportó la historia clínica · JSON, con todos sus pacientes atendidos',
        );
    });
});

describe('ClinicalAccessTrailCard', () => {
    it('lists who did what and when', () => {
        render(
            <ClinicalAccessTrailCard
                trail={page([
                    buildEntry(),
                    buildEntry({
                        id: 2,
                        action: 'note_written',
                        professional: { membership_id: 5, name: null },
                    }),
                ])}
                onPageChange={vi.fn()}
            />,
        );

        expect(screen.getByText('Dra. Carla Ruiz')).toBeTruthy();
        expect(screen.getByText('Leyó las notas clínicas')).toBeTruthy();
        expect(screen.getByText('Escribió una nota')).toBeTruthy();
        expect(screen.getByText('—')).toBeTruthy();
        expect(
            screen.getAllByText(formatShortDateTime('2026-10-20T13:30:00Z')),
        ).toHaveLength(2);
    });

    // #359: the trail holds what every professional did with the medication
    // they indicated, so its description no longer says it leaves that out.
    it("describes a trail that includes other professionals' medication", () => {
        render(
            <ClinicalAccessTrailCard
                trail={page([buildEntry({ action: 'prescription_issued' })])}
                onPageChange={vi.fn()}
            />,
        );

        expect(
            screen.getByText(
                'Quién leyó, escribió, enmendó, anuló o exportó esta historia clínica, y cuándo.',
            ),
        ).toBeTruthy();
        expect(screen.queryByText(/No incluye/)).toBeNull();
    });

    it('says so when nothing was recorded yet', () => {
        render(
            <ClinicalAccessTrailCard trail={page([])} onPageChange={vi.fn()} />,
        );

        expect(
            screen.getByText('Todavía no hay accesos registrados.'),
        ).toBeTruthy();
    });

    // A kept link to a page the newest-first trail has since moved past.
    it('offers the most recent page when the page asked for is past the end', () => {
        const onPageChange = vi.fn();
        render(
            <ClinicalAccessTrailCard
                trail={page([], { current_page: 9, last_page: 3, total: 25 })}
                onPageChange={onPageChange}
            />,
        );

        expect(
            screen.queryByText('Todavía no hay accesos registrados.'),
        ).toBeNull();
        fireEvent.click(
            screen.getByRole('button', { name: 'Ver los más recientes' }),
        );

        expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('moves to another page of the trail', () => {
        const onPageChange = vi.fn();
        render(
            <ClinicalAccessTrailCard
                trail={page([buildEntry()], { last_page: 3, total: 25 })}
                onPageChange={onPageChange}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: '2' }));

        expect(onPageChange).toHaveBeenCalledWith(2);
    });
});
