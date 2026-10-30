<?php

declare(strict_types=1);

namespace App\Actions\Medications;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\MedicationSource;
use App\Data\Medications\MedicationListingData;
use App\Data\Medications\MedicationSearchData;
use App\Enums\MedicationSearchField;
use App\Exceptions\Medications\MedicationSourceUnavailableException;
use App\Models\MedicationProduct;
use App\Models\MedicationSearch;
use App\Support\FoldedText;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;

/**
 * The medication catalog answers from what it holds (#377, ADR 0031). A term no recent search covers is asked to the
 * national vademecum first, by commercial name and, when that page isn't full, by generic name, and everything it
 * lists is kept: keeping only what someone picked would answer later searches with a partial list. If the source fails
 * the catalog answers with what it holds, and the field stays free text.
 *
 * @implements Action<MedicationSearchData>
 */
class SearchMedicationsAction implements Action
{
    public const int RESULTS_LIMIT = 10;

    /**
     * ANMAT's page: fewer results than this mean the search came back whole.
     */
    private const int SOURCE_PAGE_SIZE = 10;

    public function __construct(
        private readonly MedicationSource $source,
    ) {}

    /**
     * @param  MedicationSearchData  $dto
     * @return Collection<int, MedicationProduct>
     */
    public function handle(Data $dto): Collection
    {
        $term = FoldedText::fold($dto->term);

        if (! MedicationSearch::query()->covering($term)->exists() && $this->source->available()) {
            $this->askSource($term);
        }

        return MedicationProduct::query()->search($term)->limit(self::RESULTS_LIMIT)->get();
    }

    private function askSource(string $term): void
    {
        try {
            $commercial = $this->source->search(MedicationSearchField::Commercial, $term);
            $this->keep($commercial, MedicationSearchField::Commercial, $term);
            $complete = false;

            if (count($commercial) < self::SOURCE_PAGE_SIZE) {
                $generic = $this->source->search(MedicationSearchField::Generic, $term);
                $this->keep($generic, MedicationSearchField::Generic, $term);
                $complete = count($generic) < self::SOURCE_PAGE_SIZE;
            }

            MedicationSearch::query()->create(['term' => $term, 'complete' => $complete, 'searched_at' => now()]);
        } catch (MedicationSourceUnavailableException $exception) {
            Log::warning($exception->getMessage(), $exception->logContext());
        }
    }

    /**
     * @param  list<MedicationListingData>  $listed
     */
    private function keep(array $listed, MedicationSearchField $field, string $term): void
    {
        foreach ($listed as $listing) {
            MedicationProduct::query()->updateOrCreate(['gtin' => $listing->gtin], [
                'certificate_number' => $listing->certificateNumber,
                'laboratory' => $listing->laboratory,
                'commercial_name' => $listing->commercialName,
                'pharmaceutical_form' => $listing->pharmaceuticalForm,
                'presentation' => $listing->presentation,
                'generic_name' => $listing->genericName,
                'listed_by_field' => $field,
                'listed_by_term' => $term,
            ]);
        }
    }
}
