import { buildClinicalNote } from '@/tests/fixtures/clinical-note';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClinicalNoteEntry } from './ClinicalNoteEntry';

const AMENDED = buildClinicalNote({
    body: 'Texto corregido.',
    version: 2,
    amended_at: '2026-08-04T10:00:00Z',
    versions: [
        {
            version: 1,
            body: 'Texto original.',
            reason: null,
            created_at: '2026-08-03T09:00:00Z',
        },
        {
            version: 2,
            body: 'Texto corregido.',
            reason: 'Dosis mal escrita.',
            created_at: '2026-08-04T10:00:00Z',
        },
    ],
});

describe('ClinicalNoteEntry (#323)', () => {
    it('shows the current text with no history while the note has one version', () => {
        render(<ClinicalNoteEntry note={buildClinicalNote()} meta="Ana" />);

        expect(screen.getByText('Nota original.')).toBeTruthy();
        expect(screen.queryByText(/versiones/)).toBeNull();
        expect(screen.queryByText('Anulada')).toBeNull();
    });

    it('keeps every version of an amended note, newest first, with its reason', () => {
        render(<ClinicalNoteEntry note={AMENDED} meta="Ana" />);

        expect(screen.getByText(/Ver las 2 versiones/)).toBeTruthy();
        const versions = screen.getAllByText(/^Versión \d/);
        expect(versions.map((node) => node.textContent)).toEqual([
            expect.stringMatching(/^Versión 2 \(actual\)/),
            expect.stringMatching(/^Versión 1 ·/),
        ]);
        expect(screen.getByText('Texto original.')).toBeTruthy();
        expect(screen.getByText('Motivo: Dosis mal escrita.')).toBeTruthy();
    });

    it('marks an annulled note with its reason and keeps its text behind a disclosure', () => {
        render(
            <ClinicalNoteEntry
                note={buildClinicalNote({
                    body: 'Nota anulada.',
                    annulment: {
                        reason: 'Paciente equivocado.',
                        created_at: '2026-08-03T11:00:00Z',
                    },
                })}
                meta="Ana"
                actions={<button type="button">Acción</button>}
            />,
        );

        expect(screen.getByText('Anulada')).toBeTruthy();
        expect(screen.getByText(/^el \d/)).toBeTruthy();
        expect(screen.getByText('Motivo: Paciente equivocado.')).toBeTruthy();
        const disclosure = screen
            .getByText('Ver el texto anulado')
            .closest('details');
        expect(disclosure?.open).toBe(false);
        expect(disclosure?.textContent).toContain('Nota anulada.');
    });
});
