<?php

declare(strict_types=1);

namespace App\Support;

use App\Exceptions\ClinicalNotes\ClinicalNoteDiagnosisRetiredException;
use App\Models\ClinicalNoteDiagnosis;
use App\Models\ClinicalNoteVersion;
use App\Models\Icd10Code;
use Illuminate\Support\Collection;

/**
 * Writes a note version's ICD-10 diagnoses (#324, ADR 0020). A diagnosis
 * the previous version already had keeps the code and description it was
 * written with; only a newly added one is copied from the catalog, and a
 * retired code can't be added.
 */
final class ClinicalNoteDiagnoses
{
    /**
     * @param  list<int>  $icd10CodeIds  in the order the professional listed them
     * @param  Collection<int, ClinicalNoteDiagnosis>  $previous  the diagnoses of the version being amended, if any
     *
     * @throws ClinicalNoteDiagnosisRetiredException
     */
    public static function record(ClinicalNoteVersion $version, array $icd10CodeIds, ?Collection $previous = null): void
    {
        $kept = ($previous ?? collect())->keyBy('icd10_code_id');
        $added = Icd10Code::query()
            ->whereKey(array_values(array_diff($icd10CodeIds, $kept->keys()->all())))
            ->get()
            ->keyBy('id');

        foreach ($icd10CodeIds as $position => $icd10CodeId) {
            /** @var ClinicalNoteDiagnosis|Icd10Code|null $source */
            $source = $kept->get($icd10CodeId) ?? $added->get($icd10CodeId);

            if ($source === null) {
                throw new ClinicalNoteDiagnosisRetiredException;
            }

            $version->diagnoses()->create([
                'position' => $position,
                'icd10_code_id' => $icd10CodeId,
                'code' => $source->code,
                'description' => $source->description,
            ]);
        }
    }
}
