<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Data\Medications\MedicationProductData;
use App\Exceptions\Medications\MedicationSourceUnavailableException;

/**
 * Where the medication catalog learns about products it doesn't hold yet (#377, ADR 0031). Swapping the national
 * medication search for a documented API (#379) or another source is another adapter and another binding.
 */
interface MedicationSource
{
    /**
     * Whether it may be asked now: turned on, and not failing recently.
     */
    public function available(): bool;

    /**
     * Every product the source finds for the term, whole: the catalog's coverage rule counts on a longer term never
     * finding anything a shorter one inside it didn't.
     *
     * @return list<MedicationProductData>
     *
     * @throws MedicationSourceUnavailableException
     */
    public function search(string $term): array;
}
