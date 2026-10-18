<?php

declare(strict_types=1);

use Carbon\CarbonImmutable;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

function insertFailedJob(CarbonImmutable $failedAt): string
{
    $uuid = (string) Str::uuid();

    DB::table('failed_jobs')->insert([
        'uuid' => $uuid,
        'connection' => 'database',
        'queue' => 'default',
        'payload' => '{}',
        'exception' => 'RuntimeException',
        'failed_at' => $failedAt,
    ]);

    return $uuid;
}

test('failed jobs past the retention window are pruned, the rest are kept', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-17 12:00:00', 'UTC'));
    $expired = insertFailedJob(now()->subHours(169)->toImmutable());
    $recent = insertFailedJob(now()->subHours(167)->toImmutable());

    $this->artisan('queue:prune-failed', ['--hours' => config('queue.failed.retention_hours')])->assertSuccessful();

    expect(DB::table('failed_jobs')->pluck('uuid')->all())->toBe([$recent])
        ->not->toContain($expired);
});

test('the prune of failed jobs runs daily in the schedule with the configured retention', function () {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn (Event $event): bool => str_contains((string) $event->command, 'queue:prune-failed'));

    expect($events)->toHaveCount(1);
    expect($events->sole()->expression)->toBe('0 0 * * *');
    expect((string) $events->sole()->command)->toContain('--hours=168');
});
