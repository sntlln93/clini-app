<?php

declare(strict_types=1);

use App\Models\MediaObjectDeletion;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\OrganizationLogo;
use App\Support\MediaObjectDeletions;
use Carbon\CarbonImmutable;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake(OrganizationLogo::DISK);
    $this->travelTo(CarbonImmutable::parse('2026-11-07 12:00:00', 'UTC'));
});

function pendingMediaObject(string $path, CarbonImmutable $deletesAt): MediaObjectDeletion
{
    Storage::disk(OrganizationLogo::DISK)->put($path, 'contents');

    return MediaObjectDeletion::query()->create([
        'disk' => OrganizationLogo::DISK,
        'path' => $path,
        'deletes_at' => $deletesAt,
    ]);
}

function deleteDueMediaObjects(): void
{
    test()->artisan('media:delete-due')->assertSuccessful();
}

test('due objects are deleted with their row, the ones not yet due are kept', function () {
    pendingMediaObject('organization-logos/1/due.png', now()->subMinute()->toImmutable());
    $notDue = pendingMediaObject('organization-logos/1/not-due.png', now()->addMinute()->toImmutable());

    deleteDueMediaObjects();

    expect(Storage::disk(OrganizationLogo::DISK)->allFiles())->toBe(['organization-logos/1/not-due.png']);
    expect(MediaObjectDeletion::query()->pluck('id')->all())->toBe([$notDue->id]);
});

test('an object a live row names again is kept, and its pending row is dropped', function () {
    $organization = Organization::factory()->center()->create();
    pendingMediaObject('organization-logos/1/named.png', now()->subDay()->toImmutable());
    OrganizationLogo::query()->create([
        'organization_id' => $organization->id,
        'mime_type' => 'image/png',
        'path' => 'organization-logos/1/named.png',
        'checksum' => hash('sha256', 'contents'),
    ]);

    deleteDueMediaObjects();

    expect(Storage::disk(OrganizationLogo::DISK)->exists('organization-logos/1/named.png'))->toBeTrue();
    expect(MediaObjectDeletion::query()->count())->toBe(0);
});

test('a storage failure keeps the pending row for the next run and does not stop the rest', function () {
    $failing = pendingMediaObject('organization-logos/1/failing.png', now()->subDays(2)->toImmutable());
    pendingMediaObject('organization-logos/1/ok.png', now()->subDay()->toImmutable());
    $disk = Storage::disk(OrganizationLogo::DISK);
    $flaky = Mockery::mock(Filesystem::class);
    $flaky->shouldReceive('delete')->with('organization-logos/1/failing.png')->andThrow(new RuntimeException('bucket down'));
    $flaky->shouldReceive('delete')->with('organization-logos/1/ok.png')->andReturnUsing(fn (string $path) => $disk->delete($path));
    Storage::set(OrganizationLogo::DISK, $flaky);

    deleteDueMediaObjects();

    expect(MediaObjectDeletion::query()->pluck('id')->all())->toBe([$failing->id]);
    expect($disk->allFiles())->toBe(['organization-logos/1/failing.png']);
});

test('a removed logo is deleted from the bucket only once the retention window is over', function () {
    config(['filesystems.media_deletion_retention_days' => 35]);
    $organization = Organization::factory()->center()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $this->actingAs($owner->user)->postJson('/api/v1/organization/logo', [
        'logo' => UploadedFile::fake()->image('logo.png', 200, 80),
    ])->assertOk();
    $path = OrganizationLogo::withoutGlobalScope('organization')->sole()->path;
    $this->actingAs($owner->user)->deleteJson('/api/v1/organization/logo')->assertNoContent();

    $this->travel(35)->days();
    $this->travel(-1)->minutes();
    deleteDueMediaObjects();
    expect(Storage::disk(OrganizationLogo::DISK)->exists($path))->toBeTrue();

    $this->travel(1)->minutes();
    deleteDueMediaObjects();
    expect(Storage::disk(OrganizationLogo::DISK)->exists($path))->toBeFalse();
    expect(MediaObjectDeletion::query()->count())->toBe(0);
});

test('the retention defaults to 35 days, also when empty or 0, and never goes below one', function (?string $value, int $days) {
    $key = 'MEDIA_DELETION_RETENTION_DAYS';
    $saved = [$_SERVER[$key] ?? null, $_ENV[$key] ?? null, getenv($key)];
    unset($_SERVER[$key], $_ENV[$key]);
    putenv($key);
    if ($value !== null) {
        $_SERVER[$key] = $value;
    }

    try {
        $config = require config_path('filesystems.php');
    } finally {
        unset($_SERVER[$key], $_ENV[$key]);
        putenv($key);
        if ($saved[0] !== null) {
            $_SERVER[$key] = $saved[0];
        }
        if ($saved[1] !== null) {
            $_ENV[$key] = $saved[1];
        }
        if ($saved[2] !== false) {
            putenv("{$key}={$saved[2]}");
        }
    }

    expect($config['media_deletion_retention_days'])->toBe($days);
})->with([
    'unset' => [null, 35],
    'empty' => ['', 35],
    'zero' => ['0', 35],
    'negative' => ['-3', 1],
    'set' => ['40', 40],
]);

test('the deletion of due media objects runs daily in the schedule', function () {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn (Event $event): bool => str_contains((string) $event->command, 'media:delete-due'));

    expect($events)->toHaveCount(1);
    expect($events->sole()->expression)->toBe('0 0 * * *');
});

/**
 * Another Postgres session holding the key's advisory lock, as a concurrent upload of the same file does until it
 * commits. A short lock_timeout turns the wait into an error instead of a hang.
 */
function holdMediaKeyLock(string $path): PDO
{
    $config = config('database.connections.'.config('database.default'));
    $session = new PDO(
        sprintf('pgsql:host=%s;port=%s;dbname=%s', $config['host'], $config['port'], $config['database']),
        $config['username'],
        $config['password'],
    );
    $session->prepare('SELECT pg_advisory_lock(hashtextextended(?, 0))')
        ->execute(['media:'.OrganizationLogo::DISK.':'.$path]);
    DB::statement("SET lock_timeout = '200ms'");

    return $session;
}

test('the cleanup of a failed upload waits for a concurrent upload of the same file instead of deleting its object', function () {
    $path = 'organization-logos/1/racing.png';
    Storage::disk(OrganizationLogo::DISK)->put($path, 'contents');
    $session = holdMediaKeyLock($path);

    try {
        expect(fn () => app(MediaObjectDeletions::class)->discardUnnamed(OrganizationLogo::DISK, $path))
            ->toThrow(QueryException::class, 'lock timeout');
    } finally {
        $session->exec('SELECT pg_advisory_unlock_all()');
    }

    expect(Storage::disk(OrganizationLogo::DISK)->exists($path))->toBeTrue();
});

test('an upload takes the key lock before writing the object', function () {
    $organization = Organization::factory()->center()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $file = UploadedFile::fake()->image('logo.png', 200, 80);
    $path = "organization-logos/{$organization->id}/".hash('sha256', $file->getContent()).'.png';
    $session = holdMediaKeyLock($path);

    try {
        $this->actingAs($owner->user)->postJson('/api/v1/organization/logo', ['logo' => $file])->assertStatus(500);
    } finally {
        $session->exec('SELECT pg_advisory_unlock_all()');
    }

    expect(Storage::disk(OrganizationLogo::DISK)->allFiles())->toBe([]);
    expect(OrganizationLogo::withoutGlobalScope('organization')->count())->toBe(0);
});
