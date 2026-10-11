<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\OrganizationLogo;
use App\Support\CurrentOrganization;
use Illuminate\Http\UploadedFile;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function paidOwner(): Membership
{
    $organization = Organization::factory()->center()->create();

    return Membership::factory()->owner()->create(['organization_id' => $organization->id]);
}

test('a guest gets 401 on every logo endpoint', function () {
    $this->getJson('/api/v1/organization/logo')->assertStatus(401);
    $this->postJson('/api/v1/organization/logo')->assertStatus(401);
    $this->deleteJson('/api/v1/organization/logo')->assertStatus(401);
});

test('a member without organization.manage gets 403 on every logo endpoint', function (string $role) {
    $organization = Organization::factory()->center()->create();
    $membership = Membership::factory()->{$role}()->create(['organization_id' => $organization->id]);

    $this->actingAs($membership->user)->getJson('/api/v1/organization/logo')->assertStatus(403);
    $this->actingAs($membership->user)->postJson('/api/v1/organization/logo', [
        'logo' => UploadedFile::fake()->image('logo.png', 200, 80),
    ])->assertStatus(403);
    $this->actingAs($membership->user)->deleteJson('/api/v1/organization/logo')->assertStatus(403);

    expect(OrganizationLogo::withoutGlobalScope('organization')->count())->toBe(0);
})->with(['professional', 'staff']);

test('an owner or admin on a paid plan uploads a logo: stored as is and exposed with a versioned public URL', function (string $role) {
    $organization = Organization::factory()->center()->create(['slug' => 'consultorio-salud']);
    $membership = Membership::factory()->{$role}()->create(['organization_id' => $organization->id]);
    $file = UploadedFile::fake()->image('logo.png', 200, 80);
    $contents = $file->getContent();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/organization/logo', ['logo' => $file]);

    $response->assertOk();
    $checksum = hash('sha256', $contents);
    expect($response->json('data.logo_url'))
        ->toBe(config('app.url').'/api/v1/booking/consultorio-salud/logo?v='.substr($checksum, 0, 16));

    $logo = OrganizationLogo::withoutGlobalScope('organization')->sole();
    expect($logo->organization_id)->toBe($organization->id);
    expect($logo->mime_type)->toBe('image/png');
    expect($logo->checksum)->toBe($checksum);
    expect($logo->binary())->toBe($contents);
})->with(['owner', 'admin']);

test('uploading again replaces the logo and changes its URL', function () {
    $owner = paidOwner();

    $first = $this->actingAs($owner->user)->postJson('/api/v1/organization/logo', [
        'logo' => UploadedFile::fake()->image('logo.png', 200, 80),
    ])->json('data.logo_url');
    $second = $this->actingAs($owner->user)->postJson('/api/v1/organization/logo', [
        'logo' => UploadedFile::fake()->image('logo.jpg', 120, 120),
    ])->json('data.logo_url');

    expect($second)->not->toBe($first);
    expect(OrganizationLogo::withoutGlobalScope('organization')->count())->toBe(1);
    expect(OrganizationLogo::withoutGlobalScope('organization')->sole()->mime_type)->toBe('image/jpeg');
});

test('the Free plan rejects uploading a logo with 409 plans.feature_unavailable and stores nothing', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($owner->user)->postJson('/api/v1/organization/logo', [
        'logo' => UploadedFile::fake()->image('logo.png', 200, 80),
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', ErrorCode::PlansFeatureUnavailable->value);
    $response->assertJsonPath('error.context.feature', 'booking_branding');
    expect(OrganizationLogo::withoutGlobalScope('organization')->count())->toBe(0);
});

test('a file that is not a PNG, JPEG or WebP image is rejected with 422', function (UploadedFile $file) {
    $owner = paidOwner();

    $this->actingAs($owner->user)->postJson('/api/v1/organization/logo', ['logo' => $file])
        ->assertStatus(422)
        ->assertJsonValidationErrors('logo');

    expect(OrganizationLogo::withoutGlobalScope('organization')->count())->toBe(0);
})->with([
    'svg' => fn () => UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
    'pdf' => fn () => UploadedFile::fake()->createWithContent('logo.pdf', "%PDF-1.4\n%%EOF"),
    'gif' => fn () => UploadedFile::fake()->image('logo.gif', 10, 10),
]);

test('a logo over 512 KB or 2000 px is rejected with 422', function (UploadedFile $file) {
    $owner = paidOwner();

    $this->actingAs($owner->user)->postJson('/api/v1/organization/logo', ['logo' => $file])
        ->assertStatus(422)
        ->assertJsonValidationErrors('logo');
})->with([
    'too heavy' => fn () => UploadedFile::fake()->image('logo.png', 200, 80)->size(513),
    'too wide' => fn () => UploadedFile::fake()->image('logo.png', 2001, 80),
]);

test('a missing logo is rejected with 422', function () {
    $owner = paidOwner();

    $this->actingAs($owner->user)->postJson('/api/v1/organization/logo', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors('logo');
});

test('validation errors are in Spanish, for the panel to show as is', function () {
    $owner = paidOwner();

    $this->actingAs($owner->user)->postJson('/api/v1/organization/logo', [
        'logo' => UploadedFile::fake()->image('logo.gif', 10, 10),
    ])->assertJsonValidationErrors(['logo' => 'El logo tiene que ser una imagen PNG, JPG o WebP.']);
});

test('GET returns null with no logo and the URL once uploaded', function () {
    $owner = paidOwner();

    $this->actingAs($owner->user)->getJson('/api/v1/organization/logo')
        ->assertOk()
        ->assertExactJson(['data' => ['logo_url' => null]]);

    $url = $this->actingAs($owner->user)->postJson('/api/v1/organization/logo', [
        'logo' => UploadedFile::fake()->image('logo.png', 200, 80),
    ])->json('data.logo_url');

    $this->actingAs($owner->user)->getJson('/api/v1/organization/logo')
        ->assertOk()
        ->assertExactJson(['data' => ['logo_url' => $url]]);
});

test('after a downgrade to Free the logo is kept, still listed, and can be removed', function () {
    $owner = paidOwner();
    $this->actingAs($owner->user)->postJson('/api/v1/organization/logo', [
        'logo' => UploadedFile::fake()->image('logo.png', 200, 80),
    ])->assertOk();
    Organization::query()->whereKey($owner->organization_id)->update(['assigned_plan' => null]);

    $this->actingAs($owner->user)->getJson('/api/v1/organization/logo')
        ->assertOk()
        ->assertJsonPath('data.logo_url', fn (?string $url) => $url !== null);

    $this->actingAs($owner->user)->deleteJson('/api/v1/organization/logo')->assertNoContent();

    expect(OrganizationLogo::withoutGlobalScope('organization')->count())->toBe(0);
});

test('removing a logo that does not exist is a no-op 204', function () {
    $owner = paidOwner();

    $this->actingAs($owner->user)->deleteJson('/api/v1/organization/logo')->assertNoContent();
});

test('an owner only reads and removes their own organization logo', function () {
    $owner = paidOwner();
    $other = paidOwner();
    OrganizationLogo::query()->create([
        'organization_id' => $other->organization_id,
        'mime_type' => 'image/png',
        'content' => base64_encode('other'),
        'checksum' => hash('sha256', 'other'),
    ]);

    $this->actingAs($owner->user)->getJson('/api/v1/organization/logo')
        ->assertOk()
        ->assertExactJson(['data' => ['logo_url' => null]]);
    $this->actingAs($owner->user)->deleteJson('/api/v1/organization/logo')->assertNoContent();

    expect(OrganizationLogo::withoutGlobalScope('organization')->where('organization_id', $other->organization_id)->exists())->toBeTrue();
});
