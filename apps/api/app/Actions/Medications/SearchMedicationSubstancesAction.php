<?php

declare(strict_types=1);

namespace App\Actions\Medications;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Medications\MedicationSearchData;
use App\Models\MedicationIngredient;

/**
 * The substances an allergy can name from the medication catalog (#383): the active substances of its suggestible
 * products, filled from the medication source like a medication search (`FillMedicationCatalogAction`), so a term the
 * catalog doesn't cover yet is asked once and later answered from the database. If the source fails or is off, the
 * catalog answers with what it holds, and the field stays free text.
 *
 * @implements Action<MedicationSearchData>
 */
class SearchMedicationSubstancesAction implements Action
{
    public const int RESULTS_LIMIT = 10;

    public function __construct(
        private readonly FillMedicationCatalogAction $fill,
    ) {}

    /**
     * @param  MedicationSearchData  $dto
     * @return list<string>
     */
    public function handle(Data $dto): array
    {
        $this->fill->handle($dto);

        /** @var list<string> */
        return MedicationIngredient::query()
            ->suggestedSubstances($dto->term)
            ->limit(self::RESULTS_LIMIT)
            ->pluck('substance')
            ->all();
    }
}
