import { useState, type KeyboardEvent } from 'react';

import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';
import { FormControl } from '@/components/ui/form';
import type { ClinicalNoteDiagnosis } from '@/types/clinical-note';
import type { Icd10Code } from '@/types/icd10-code';
import { useIcd10CodeSearch } from './use-icd10-code-search';

type DiagnosisComboboxProps = {
    selected: ClinicalNoteDiagnosis[];
    onChange: (diagnoses: ClinicalNoteDiagnosis[]) => void;
    disabled: boolean;
};

function toCode(diagnosis: ClinicalNoteDiagnosis): Icd10Code {
    return {
        id: diagnosis.icd10_code_id,
        code: diagnosis.code,
        description: diagnosis.description,
    };
}

function toDiagnosis(code: Icd10Code): ClinicalNoteDiagnosis {
    return {
        icd10_code_id: code.id,
        code: code.code,
        description: code.description,
    };
}

// Searches the ICD-10 catalog as the professional types (#324). Picking a
// code adds it after the others; picking a selected one again removes it.
export function DiagnosisCombobox({
    selected,
    onChange,
    disabled,
}: DiagnosisComboboxProps) {
    const [query, setQuery] = useState('');
    const { codes, isSearching, isEmpty, isError } = useIcd10CodeSearch(query);

    const emptyMessage =
        query.trim() === ''
            ? 'Escribí un código, como J02, o parte del diagnóstico.'
            : isSearching
              ? 'Buscando…'
              : isError
                ? 'No se pudo buscar en el catálogo. Probá de nuevo.'
                : isEmpty
                  ? 'No hay diagnósticos que coincidan.'
                  : null;

    // Enter only picks the code highlighted with the arrows. With none, it
    // must not submit the note around the field, which would save it without
    // the diagnosis being searched. Nothing is highlighted on its own: the
    // results arrive after the typing, and the previous search's list stays
    // up meanwhile, so a guess could pick a stale code.
    function keepEnterInSearch(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    }

    return (
        <Combobox<Icd10Code, true>
            multiple
            items={codes}
            filter={null}
            value={selected.map(toCode)}
            onValueChange={(codes) => onChange(codes.map(toDiagnosis))}
            inputValue={query}
            onInputValueChange={setQuery}
            itemToStringLabel={(code) => `${code.code} ${code.description}`}
            isItemEqualToValue={(code, other) => code.id === other.id}
        >
            <FormControl
                render={
                    <ComboboxInput
                        className="w-full"
                        placeholder="Buscar por código o nombre…"
                        showTrigger={false}
                        disabled={disabled}
                        onKeyDown={keepEnterInSearch}
                    />
                }
            />
            <ComboboxContent>
                <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
                <ComboboxList>
                    {(code: Icd10Code) => (
                        <ComboboxItem key={code.id} value={code}>
                            <span className="shrink-0 font-mono text-xs font-medium">
                                {code.code}
                            </span>
                            <span className="min-w-0">{code.description}</span>
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
