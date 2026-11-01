<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Data\Medications\MedicationProductData;
use App\Exceptions\Medications\MedicationSourceUnavailableException;

interface MedicationSource
{
    /**
     * Whether it may be asked now: turned on, and not failing recently.
     */
    public function available(): bool;

    /**
     * Unfiltered: the coverage rule counts on a longer term never finding anything a shorter one inside it didn't.
     *
     * @return list<MedicationProductData>
     *
     * @throws MedicationSourceUnavailableException
     */
    public function search(string $term): array;
}
