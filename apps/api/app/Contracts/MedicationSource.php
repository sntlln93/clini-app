<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Data\Medications\MedicationDetailData;
use App\Data\Medications\MedicationListingData;
use App\Enums\MedicationSearchField;
use App\Exceptions\Medications\MedicationSourceUnavailableException;

/**
 * Where the medication catalog learns about products it doesn't hold yet (#377, ADR 0031). Swapping the national
 * vademecum for another source (the catalog app, a prescription platform's vademecum, #314) is another adapter.
 */
interface MedicationSource
{
    /**
     * Whether it may be asked now: turned on, and not failing recently.
     */
    public function available(): bool;

    /**
     * The first page of products whose name in that field contains the term.
     *
     * @return list<MedicationListingData>
     *
     * @throws MedicationSourceUnavailableException
     */
    public function search(MedicationSearchField $field, string $term): array;

    /**
     * The detail of the product the search for that term listed with that GTIN, if it still lists it.
     *
     * @throws MedicationSourceUnavailableException
     */
    public function detail(MedicationSearchField $field, string $term, string $gtin): ?MedicationDetailData;
}
