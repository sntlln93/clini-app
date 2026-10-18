<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\ClinicalNoteVersion;
use App\Models\Icd10Code;

/**
 * Writes a note version's ICD-10 diagnoses (#324, ADR 0020), copying each
 * code and description from the catalog so the version keeps them as they
 * were written.
 */
final class ClinicalNoteDiagnoses
{
    /**
     * A retired (soft-deleted) code is copied too: the request only lets
     * one through when the version being amended already had it.
     *
     * @param  list<int>  $icd10CodeIds
     */
    public static function record(ClinicalNoteVersion $version, array $icd10CodeIds): void
    {
        $codes = Icd10Code::withTrashed()->whereKey($icd10CodeIds)->get()->keyBy('id');

        foreach ($icd10CodeIds as $position => $icd10CodeId) {
            /** @var Icd10Code $code */
            $code = $codes->get($icd10CodeId);

            $version->diagnoses()->create([
                'position' => $position,
                'icd10_code_id' => $code->id,
                'code' => $code->code,
                'description' => $code->description,
            ]);
        }
    }
}
