import { zodResolver } from '@hookform/resolvers/zod';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Form } from '@/components/ui/form';
import { api } from '@/lib/api';
import {
    MAX_DIAGNOSES,
    noteSchema,
    type NoteFormValues,
} from '@/lib/clinical-note-schema';
import type { ClinicalNoteDiagnosis } from '@/types/clinical-note';
import { DiagnosesField } from './DiagnosesField';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn() },
}));

const PHARYNGITIS = {
    id: 7,
    code: 'J02.9',
    description: 'Faringitis aguda, no especificada',
};
const HEADACHE: ClinicalNoteDiagnosis = {
    icd10_code_id: 3,
    code: 'R51',
    description: 'Cefalea',
};

let submitted: NoteFormValues | null = null;

function NoteForm({ diagnoses }: { diagnoses: ClinicalNoteDiagnosis[] }) {
    const form = useForm<NoteFormValues>({
        resolver: zodResolver(noteSchema),
        defaultValues: { body: 'Nota.', diagnoses },
    });

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit((values) => {
                    submitted = values;
                })}
            >
                <DiagnosesField control={form.control} name="diagnoses" />
                <button type="submit">Guardar</button>
            </form>
        </Form>
    );
}

function renderField(diagnoses: ClinicalNoteDiagnosis[] = []) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <NoteForm diagnoses={diagnoses} />
        </QueryClientProvider>,
    );
}

async function submit() {
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(submitted).not.toBeNull());

    return submitted?.diagnoses;
}

describe('DiagnosesField (#324)', () => {
    beforeEach(() => {
        submitted = null;
        vi.mocked(api.get).mockReset();
        vi.mocked(api.get).mockResolvedValue({ data: { data: [PHARYNGITIS] } });
    });

    it('searches the catalog as the professional types and adds the picked code after the others', async () => {
        renderField([HEADACHE]);

        const input = screen.getByRole('combobox', {
            name: 'Diagnósticos CIE-10 (opcional)',
        });
        // base-ui only opens the popup on typing, which sets `inputType`; a bare `change` reads as autofill.
        fireEvent.input(input, {
            target: { value: 'farin' },
            inputType: 'insertText',
        });
        const option = await screen.findByRole('option', {
            name: /J02\.9/,
        });
        expect(api.get).toHaveBeenCalledWith('/icd10-codes', {
            params: { q: 'farin' },
        });
        // base-ui's roving-tabindex needs a real pointer sequence in jsdom; a bare `click` doesn't register.
        fireEvent.pointerDown(option);
        fireEvent.pointerUp(option);
        fireEvent.click(option);

        expect(
            await screen.findByText('Faringitis aguda, no especificada'),
        ).toBeTruthy();
        expect(await submit()).toEqual([
            HEADACHE,
            {
                icd10_code_id: 7,
                code: 'J02.9',
                description: 'Faringitis aguda, no especificada',
            },
        ]);
    });

    it('does not search before anything is typed', () => {
        renderField();

        expect(api.get).not.toHaveBeenCalled();
    });

    it('removes a selected diagnosis', async () => {
        renderField([HEADACHE]);

        fireEvent.click(screen.getByRole('button', { name: 'Quitar R51' }));

        expect(screen.queryByText('Cefalea')).toBeNull();
        expect(await submit()).toEqual([]);
    });

    it('stops adding once the note has the most diagnoses it admits', () => {
        renderField(
            Array.from({ length: MAX_DIAGNOSES }, (_, index) => ({
                icd10_code_id: index + 1,
                code: `A0${index}`,
                description: `Diagnóstico ${index}`,
            })),
        );

        expect(
            screen
                .getByRole('combobox', {
                    name: 'Diagnósticos CIE-10 (opcional)',
                })
                .hasAttribute('disabled'),
        ).toBe(true);
        expect(
            screen.getByText(
                `Una nota admite hasta ${MAX_DIAGNOSES} diagnósticos.`,
            ),
        ).toBeTruthy();
    });
});
