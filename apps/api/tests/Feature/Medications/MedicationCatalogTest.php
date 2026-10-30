<?php

declare(strict_types=1);

use App\Contracts\MedicationSource;
use App\Data\Medications\MedicationDetailData;
use App\Data\Medications\MedicationIngredientData;
use App\Data\Medications\MedicationListingData;
use App\Enums\MedicationSearchField;
use App\Exceptions\Medications\MedicationSourceUnavailableException;
use App\Models\MedicationProduct;
use App\Models\MedicationSearch;
use App\Models\Membership;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * A source that answers what it is given and records what it was asked.
 *
 * @param  array<string, list<MedicationListingData>>  $listings  by "field:term"
 */
function fakeMedicationSource(array $listings = [], ?MedicationDetailData $detail = null, bool $available = true, bool $failing = false): ArrayObject
{
    $calls = new ArrayObject;

    app()->instance(MedicationSource::class, new class($listings, $detail, $available, $failing, $calls) implements MedicationSource
    {
        /**
         * @param  array<string, list<MedicationListingData>>  $listings
         */
        public function __construct(
            private array $listings,
            private ?MedicationDetailData $detail,
            private bool $available,
            private bool $failing,
            private ArrayObject $calls,
        ) {}

        public function available(): bool
        {
            return $this->available;
        }

        public function search(MedicationSearchField $field, string $term): array
        {
            $this->calls[] = "search:{$field->value}:{$term}";

            if ($this->failing) {
                throw new MedicationSourceUnavailableException('search');
            }

            return $this->listings["{$field->value}:{$term}"] ?? [];
        }

        public function detail(MedicationSearchField $field, string $term, string $gtin): ?MedicationDetailData
        {
            $this->calls[] = "detail:{$field->value}:{$term}:{$gtin}";

            if ($this->failing) {
                throw new MedicationSourceUnavailableException('detail');
            }

            return $this->detail;
        }
    });

    return $calls;
}

function listedMedication(string $gtin, string $commercialName, string $genericName = 'DIPIRONA 500 MG'): MedicationListingData
{
    return new MedicationListingData($gtin, '19504', 'QUIMICA MONTPELLIER S A', $commercialName, 'COMPRIMIDO', 'BLISTER por 20 UNIDADES', $genericName);
}

function searchMedications(Membership $membership, string $q): array
{
    return test()->actingAs($membership->user)
        ->getJson('/api/v1/medications?'.http_build_query(['q' => $q]))
        ->assertOk()
        ->json('data');
}

test('a term the catalog doesn\'t hold is asked by commercial and generic name, and everything listed is kept', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $calls = fakeMedicationSource([
        'commercial:migral' => [listedMedication('07795378001096', 'MIGRAL 500'), listedMedication('07795378001058', 'MIGRAL COMPOSITUM')],
    ]);

    $found = searchMedications($membership, '  Migral ');

    expect(array_column($found, 'commercial_name'))->toBe(['MIGRAL 500', 'MIGRAL COMPOSITUM'])
        ->and($found[0]['ingredients'])->toBeNull()
        ->and($calls->getArrayCopy())->toBe(['search:commercial:migral', 'search:generic:migral'])
        ->and(MedicationProduct::query()->count())->toBe(2)
        ->and(MedicationSearch::query()->sole()->only(['term', 'complete']))->toBe(['term' => 'migral', 'complete' => true]);
});

test('a term searched recently, or inside a term that came back whole, is answered by the catalog alone', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    MedicationProduct::factory()->create(['commercial_name' => 'MIGRAL 500', 'generic_name' => 'DIPIRONA 500 MG']);
    MedicationSearch::query()->create(['term' => 'migral', 'complete' => true, 'searched_at' => now()->subDays(2)]);
    $calls = fakeMedicationSource();

    expect(array_column(searchMedications($membership, 'MIGRAL'), 'commercial_name'))->toBe(['MIGRAL 500'])
        ->and(array_column(searchMedications($membership, 'migral 500'), 'commercial_name'))->toBe(['MIGRAL 500'])
        ->and($calls->getArrayCopy())->toBe([]);
});

test('a broader term that came back with a full page doesn\'t cover longer ones, and an old search covers nothing', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    MedicationSearch::query()->create(['term' => 'ibupro', 'complete' => false, 'searched_at' => now()]);
    MedicationSearch::query()->create(['term' => 'migral', 'complete' => true, 'searched_at' => now()->subDays(MedicationSearch::COVERAGE_DAYS + 1)]);
    $calls = fakeMedicationSource();

    searchMedications($membership, 'ibuprofeno');
    searchMedications($membership, 'migral');

    expect($calls->getArrayCopy())->toBe([
        'search:commercial:ibuprofeno', 'search:generic:ibuprofeno',
        'search:commercial:migral', 'search:generic:migral',
    ]);
});

test('a full page of commercial names skips the generic search and leaves the term incomplete', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $page = array_map(fn (int $n) => listedMedication("0779000000000{$n}", "IBUPROFENO GENERICO {$n}", 'IBUPROFENO 400 MG'), range(0, 9));
    $calls = fakeMedicationSource(['commercial:ibuprofeno' => $page]);

    expect(searchMedications($membership, 'ibuprofeno'))->toHaveCount(10)
        ->and($calls->getArrayCopy())->toBe(['search:commercial:ibuprofeno'])
        ->and(MedicationSearch::query()->sole()->complete)->toBeFalse();
});

test('the catalog finds a product by its generic name too, ignoring accents', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    MedicationProduct::factory()->create(['commercial_name' => 'NOVALGINA', 'generic_name' => 'DIPIRONA 500 MG']);
    fakeMedicationSource(available: false);

    expect(array_column(searchMedications($membership, 'dipíroná'), 'commercial_name'))->toBe(['NOVALGINA']);
});

test('when the source fails or is off, the catalog answers with what it holds and remembers no search', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    MedicationProduct::factory()->create(['commercial_name' => 'MIGRAL 500']);
    fakeMedicationSource(failing: true);

    expect(array_column(searchMedications($membership, 'migral'), 'commercial_name'))->toBe(['MIGRAL 500'])
        ->and(MedicationSearch::query()->count())->toBe(0);

    $calls = fakeMedicationSource(available: false);
    searchMedications($membership, 'migral');

    expect($calls->getArrayCopy())->toBe([]);
});

test('a picked product\'s detail is asked once by replaying the search that listed it, and kept with its substances', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $product = MedicationProduct::factory()->create(['gtin' => '07795378001096', 'listed_by_field' => MedicationSearchField::Commercial, 'listed_by_term' => 'migral']);
    $calls = fakeMedicationSource(detail: new MedicationDetailData('07795378001096', [
        new MedicationIngredientData('CAFEINA', '100', 'MG', null, null, null),
        new MedicationIngredientData('DIPIRONA SODICA', '500', 'MG', null, null, null),
    ], 'ORAL', 'BAJO RECETA', '303248'));

    $this->actingAs($membership->user)
        ->getJson("/api/v1/medications/{$product->gtin}")
        ->assertOk()
        ->assertJsonPath('data.ingredients', [
            ['name' => 'CAFEINA', 'substance' => 'cafeina', 'quantity' => '100', 'unit' => 'MG'],
            ['name' => 'DIPIRONA SODICA', 'substance' => 'dipirona', 'quantity' => '500', 'unit' => 'MG'],
        ]);
    $this->actingAs($membership->user)->getJson("/api/v1/medications/{$product->gtin}")->assertOk();

    expect($calls->getArrayCopy())->toBe(['detail:commercial:migral:07795378001096'])
        ->and($product->fresh()?->dispensing_condition)->toBe('BAJO RECETA');
});

test('without an answer the product stays without ingredients, and the next pick asks again', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $product = MedicationProduct::factory()->create();
    $calls = fakeMedicationSource(failing: true);

    $this->actingAs($membership->user)->getJson("/api/v1/medications/{$product->gtin}")->assertOk()->assertJsonPath('data.ingredients', null);
    $this->actingAs($membership->user)->getJson("/api/v1/medications/{$product->gtin}")->assertOk();

    expect($calls->getArrayCopy())->toHaveCount(2);
});

test('a search needs five characters and the plan that indicates medication', function () {
    $paid = Membership::factory()->onPaidPlan()->professional()->create();
    $free = Membership::factory()->professional()->create();
    fakeMedicationSource(available: false);

    $this->actingAs($paid->user)->getJson('/api/v1/medications?q='.urlencode(' ibu '))->assertUnprocessable()->assertJsonValidationErrors('q');
    app(CurrentOrganization::class)->set(null);
    $this->actingAs($free->user)->getJson('/api/v1/medications?q=ibuprofeno')->assertConflict()->assertJsonPath('error.code', 'plans.feature_unavailable');
});

test('the catalog is read-only and needs a session', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $product = MedicationProduct::factory()->create();

    $this->getJson('/api/v1/medications?q=ibuprofeno')->assertUnauthorized();
    $this->actingAs($membership->user)->postJson('/api/v1/medications', [])->assertMethodNotAllowed();
    $this->actingAs($membership->user)->deleteJson("/api/v1/medications/{$product->gtin}")->assertMethodNotAllowed();
    $this->actingAs($membership->user)->getJson('/api/v1/medications/07790000000000')->assertNotFound();
});
