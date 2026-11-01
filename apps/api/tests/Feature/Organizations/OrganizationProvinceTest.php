<?php

declare(strict_types=1);

use App\Enums\Permission;
use App\Enums\Province;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('the owner declares where the practice attends, and the session carries it', function () {
    $owner = Membership::factory()->owner()->create();

    $this->actingAs($owner->user)->putJson('/api/v1/organization/province', ['province' => 'la-rioja'])
        ->assertOk()
        ->assertJsonPath('data.province', 'la-rioja');

    expect($owner->organization->refresh()->province)->toBe(Province::LaRioja);
    $this->actingAs($owner->user)->getJson('/api/v1/me')->assertJsonPath('organization.province', 'la-rioja');
});

test('the province can be taken away', function () {
    $owner = Membership::factory()->owner()->create();
    $owner->organization->forceFill(['province' => Province::Cordoba])->save();

    $this->actingAs($owner->user)->putJson('/api/v1/organization/province', ['province' => null])
        ->assertOk()
        ->assertJsonPath('data.province', null);
});

test('only whoever manages the organization declares it', function (Closure $membership, bool $allowed) {
    $response = $this->actingAs($membership()->user)->putJson('/api/v1/organization/province', ['province' => 'cordoba']);

    $allowed ? $response->assertOk() : $response->assertForbidden();
})->with([
    'owner' => [fn () => Membership::factory()->owner()->create(), true],
    'admin' => [fn () => Membership::factory()->admin()->create(), true],
    'staff with organization.manage' => [fn () => Membership::factory()->staff()->create(['extra_permissions' => [Permission::OrganizationManage]]), true],
    'professional' => [fn () => Membership::factory()->professional()->create(), false],
    'staff' => [fn () => Membership::factory()->staff()->create(), false],
]);

test('a province it doesn\'t know is refused', function () {
    $owner = Membership::factory()->owner()->create();

    $this->actingAs($owner->user)->putJson('/api/v1/organization/province', ['province' => 'marte'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('province');
});

test('the declared province wins over the address\'s, which still answers when there is none', function () {
    $organization = Organization::factory()->inProvince(Province::Cordoba)->create();

    expect($organization->resolveProvince())->toBe(Province::Cordoba);

    $organization->forceFill(['province' => Province::LaRioja])->save();

    expect($organization->refresh()->resolveProvince())->toBe(Province::LaRioja);
});
