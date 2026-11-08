<?php

declare(strict_types=1);

use App\Enums\ProfessionalLicenseMismatch;
use App\Enums\ProfessionalLicenseStatus;
use App\Enums\Province;
use App\Models\ProfessionalLicense;
use App\Models\User;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;

beforeEach(function () {
    // The fake registry unless a test fakes the real one, whatever the run's env says (CI runs the suite with each).
    config(['services.professional_registry.adapter' => 'fake']);
    Sleep::fake();
});

afterEach(function () {
    $this->travelBack();
});

function licenseCheckedDaysAgo(?int $days, string $documentNumber = '30123456'): ProfessionalLicense
{
    $user = User::factory()->create();
    $user->forceFill(['document_number' => $documentNumber])->save();

    return ProfessionalLicense::factory()
        ->verified($days === null ? null : now()->subDays($days)->toIso8601String())
        ->create(['user_id' => $user->id, 'number' => '123456', 'province' => Province::CiudadAutonomaDeBuenosAires]);
}

/**
 * @return list<string>
 */
function lookedUpDocuments(): array
{
    return Http::recorded()
        ->map(fn (array $pair) => $pair[0])
        ->filter(fn (Request $request) => $request->method() === 'POST')
        ->map(fn (Request $request) => $request->data()['dni'])
        ->values()
        ->all();
}

test('a license that stopped being enabled turns into a mismatch the next time it is checked', function () {
    $license = licenseCheckedDaysAgo(8);
    fakeNationalProfessionalSearch(nationalProfessionalSearchResults([nationalProfessionalSearchItem([['Médico', '123456', 'CABA', 'Suspendido']])]));

    $this->artisan('professionals:reverify-licenses')->assertSuccessful();

    expect($license->refresh())
        ->status->toBe(ProfessionalLicenseStatus::Mismatch)
        ->mismatch_reason->toBe(ProfessionalLicenseMismatch::NotEnabled)
        ->situation->toBe('Suspendido')
        ->checked_at->toBeGreaterThan(now()->subMinute());
});

test('only licenses never answered, or answered a week ago, are checked again, oldest first', function () {
    $this->travelTo('2026-11-01 12:00:00');
    licenseCheckedDaysAgo(3, '30000003');
    licenseCheckedDaysAgo(7, '30000007');
    licenseCheckedDaysAgo(30, '30000030');
    licenseCheckedDaysAgo(null, '30000000')->forceFill(['status' => ProfessionalLicenseStatus::Unverified, 'checked_at' => null, 'attempted_at' => null])->save();
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('no-results.html'));

    $this->artisan('professionals:reverify-licenses')->assertSuccessful();

    expect(lookedUpDocuments())->toBe(['30000000', '30000030', '30000007']);
    Sleep::assertSleptTimes(2);
});

test('a professional without a DNI is not looked up', function () {
    licenseCheckedDaysAgo(30)->user()->firstOrFail()->forceFill(['document_number' => null])->save();
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $this->artisan('professionals:reverify-licenses')->assertSuccessful();

    Http::assertNothingSent();
});

test('while the registry is paused nothing is asked nor changed', function () {
    $license = licenseCheckedDaysAgo(30);
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('no-results.html'));
    pauseNationalProfessionalSearch();

    $this->artisan('professionals:reverify-licenses')->assertSuccessful();

    Http::assertNothingSent();
    expect($license->refresh()->status)->toBe(ProfessionalLicenseStatus::Verified);
});

test('the run stops at the first failure, and what the registry said before stays', function () {
    $first = licenseCheckedDaysAgo(30, '30000030');
    $second = licenseCheckedDaysAgo(20, '30000020');
    fakeNationalProfessionalSearch(fn () => Http::response('Bad Gateway', 502));

    $this->artisan('professionals:reverify-licenses')->assertSuccessful();

    expect(lookedUpDocuments())->toBe(['30000030'])
        ->and($first->refresh()->status)->toBe(ProfessionalLicenseStatus::Verified)
        ->and($second->refresh()->status)->toBe(ProfessionalLicenseStatus::Verified);
});

test('a run looks up at most its share of professionals', function () {
    licenseCheckedDaysAgo(30, '30000030');
    licenseCheckedDaysAgo(20, '30000020');
    licenseCheckedDaysAgo(10, '30000010');
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('no-results.html'));
    config(['services.professional_registry.per_run' => 2]);

    $this->artisan('professionals:reverify-licenses')->assertSuccessful();

    expect(lookedUpDocuments())->toBe(['30000030', '30000020']);
});

test('a lookup that keeps failing goes to the back of the queue instead of holding everyone else', function () {
    $this->travelTo('2026-11-01 03:00:00');
    licenseCheckedDaysAgo(null, '30000001')->forceFill(['status' => ProfessionalLicenseStatus::Unverified, 'checked_at' => null, 'attempted_at' => null])->save();
    licenseCheckedDaysAgo(20, '30000020');
    fakeNationalProfessionalSearch(fn (Request $request) => $request->data()['dni'] === '30000001'
        ? Http::response('Bad Gateway', 502)
        : Http::response(nationalProfessionalSearchFixture('no-results.html')));

    // Day one: the never-checked one fails first and stops the run.
    $this->artisan('professionals:reverify-licenses')->assertSuccessful();
    expect(lookedUpDocuments())->toBe(['30000001']);

    // Day two, the pause long over: the other one goes first, and the failing one is still tried after it.
    $this->travelTo('2026-11-02 03:00:00');
    $this->artisan('professionals:reverify-licenses')->assertSuccessful();

    expect(array_slice(lookedUpDocuments(), 1))->toBe(['30000020', '30000001']);
});

test('the reverification is scheduled daily', function () {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn (Event $event): bool => str_contains((string) $event->command, 'professionals:reverify-licenses'));

    expect($events)->toHaveCount(1)
        ->and($events->sole()->expression)->toBe('0 0 * * *');
});
