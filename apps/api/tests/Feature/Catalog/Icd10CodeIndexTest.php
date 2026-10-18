<?php

declare(strict_types=1);

use App\Http\Controllers\Catalog\Icd10CodeController;
use App\Models\Icd10Code;
use App\Models\Membership;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function searchIcd10Codes(Membership $membership, string $q): array
{
    return test()->actingAs($membership->user)
        ->getJson('/api/v1/icd10-codes?'.http_build_query(['q' => $q]))
        ->assertOk()
        ->json('data');
}

test('it finds codes by their start, with or without the dot and in any case', function (string $q) {
    $membership = Membership::factory()->create();
    Icd10Code::factory()->create(['code' => 'J02.9', 'description' => 'Faringitis aguda, no especificada']);
    Icd10Code::factory()->create(['code' => 'J20.9', 'description' => 'Bronquitis aguda, no especificada']);

    expect(array_column(searchIcd10Codes($membership, $q), 'code'))->toBe(['J02.9']);
})->with(['J02', 'j02.9', 'J029']);

test('it finds codes by their description, ignoring case and accents', function (string $q) {
    $membership = Membership::factory()->create();
    Icd10Code::factory()->create(['code' => 'I10', 'description' => 'Hipertensión esencial (primaria)']);
    Icd10Code::factory()->create(['code' => 'J02.9', 'description' => 'Faringitis aguda, no especificada']);

    expect(array_column(searchIcd10Codes($membership, $q), 'code'))->toBe(['I10']);
})->with(['hipertension', 'HIPERTENSIÓN', 'esencial']);

test('codes starting with the term come before descriptions containing it', function () {
    $membership = Membership::factory()->create();
    Icd10Code::factory()->create(['code' => 'A01', 'description' => 'Fiebre que menciona r51 en el texto']);
    Icd10Code::factory()->create(['code' => 'R51', 'description' => 'Cefalea']);

    expect(array_column(searchIcd10Codes($membership, 'R51'), 'code'))->toBe(['R51', 'A01']);
});

test('each result carries its id, code and description', function () {
    $membership = Membership::factory()->create();
    $code = Icd10Code::factory()->create(['code' => 'R51', 'description' => 'Cefalea']);

    expect(searchIcd10Codes($membership, 'cefalea'))->toBe([
        ['id' => $code->id, 'code' => 'R51', 'description' => 'Cefalea'],
    ]);
});

test('an empty search returns nothing instead of the whole catalog', function (string $q) {
    $membership = Membership::factory()->create();
    Icd10Code::factory()->count(3)->create();

    expect(searchIcd10Codes($membership, $q))->toBe([]);
})->with(['', '   ']);

test('it caps the results', function () {
    $membership = Membership::factory()->create();
    foreach (range(10, 10 + Icd10CodeController::RESULTS_LIMIT) as $number) {
        Icd10Code::factory()->create(['code' => "K{$number}"]);
    }

    expect(searchIcd10Codes($membership, 'K'))->toHaveCount(Icd10CodeController::RESULTS_LIMIT);
});

test('a retired code is not offered', function () {
    $membership = Membership::factory()->create();
    Icd10Code::factory()->create(['code' => 'R51', 'description' => 'Cefalea'])->delete();

    expect(searchIcd10Codes($membership, 'R51'))->toBe([]);
});

test('LIKE wildcards in the term match literally', function () {
    $membership = Membership::factory()->create();
    Icd10Code::factory()->create(['code' => 'R51', 'description' => 'Cefalea']);

    expect(searchIcd10Codes($membership, '%'))->toBe([])
        ->and(searchIcd10Codes($membership, '_51'))->toBe([]);
});

test('a too long search returns 422', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->getJson('/api/v1/icd10-codes?q='.str_repeat('a', 101))
        ->assertStatus(422)
        ->assertJsonValidationErrors('q');
});

test('the catalog is global: two organizations search the same codes', function () {
    $code = Icd10Code::factory()->create(['code' => 'R51', 'description' => 'Cefalea']);
    $membershipA = Membership::factory()->create();
    $membershipB = Membership::factory()->create();

    $resultsA = searchIcd10Codes($membershipA, 'R51');
    // Tests share the CurrentOrganization singleton across requests (unlike production).
    app(CurrentOrganization::class)->set(null);
    $resultsB = searchIcd10Codes($membershipB, 'R51');

    expect(array_column($resultsA, 'id'))->toBe([$code->id])
        ->and(array_column($resultsB, 'id'))->toBe([$code->id]);
});

test('a guest gets 401', function () {
    $this->getJson('/api/v1/icd10-codes?q=R51')->assertStatus(401);
});

test('the catalog is read-only: POST, PATCH and DELETE are not routable', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/icd10-codes', ['code' => 'X00'])->assertStatus(405);
    $this->actingAs($membership->user)->patchJson('/api/v1/icd10-codes', ['code' => 'X00'])->assertStatus(405);
    $this->actingAs($membership->user)->deleteJson('/api/v1/icd10-codes')->assertStatus(405);
});
