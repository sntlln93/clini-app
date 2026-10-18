import type { ClinicalNoteDiagnosis } from '@/types/clinical-note';

type DiagnosisListProps = {
    diagnoses: ClinicalNoteDiagnosis[];
};

// A note version's ICD-10 diagnoses, in the order the professional listed
// them (#324); nothing when it has none.
export function DiagnosisList({ diagnoses }: DiagnosisListProps) {
    if (diagnoses.length === 0) {
        return null;
    }

    return (
        <ul aria-label="Diagnósticos CIE-10" className="mt-2 space-y-1">
            {diagnoses.map((diagnosis) => (
                <li key={diagnosis.icd10_code_id} className="flex gap-2">
                    <span className="shrink-0 font-mono text-xs leading-5 font-medium">
                        {diagnosis.code}
                    </span>
                    <span className="min-w-0 wrap-break-word">
                        {diagnosis.description}
                    </span>
                </li>
            ))}
        </ul>
    );
}
