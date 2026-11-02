<?php

declare(strict_types=1);

namespace App\Actions\Medications;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Medications\MedicationSearchData;
use App\Models\MedicationProduct;
use Illuminate\Database\Eloquent\Collection;

/**
 * The medication catalog answers from what it holds (#377, ADR 0031), once a term no recent search covers has been
 * asked to the medication source (`FillMedicationCatalogAction`). If the source fails the catalog answers with what it
 * holds, and the field stays free text.
 *
 * @implements Action<MedicationSearchData>
 */
class SearchMedicationsAction implements Action
{
    public const int RESULTS_LIMIT = 10;

    public function __construct(
        private readonly FillMedicationCatalogAction $fill,
    ) {}

    /**
     * @param  MedicationSearchData  $dto
     * @return Collection<int, MedicationProduct>
     */
    public function handle(Data $dto): Collection
    {
        $this->fill->handle($dto);

        return MedicationProduct::query()
            ->suggestible()
            ->search($dto->term)
            ->with('ingredients')
            ->limit(self::RESULTS_LIMIT)
            ->get();
    }
}
