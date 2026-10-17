<?php

declare(strict_types=1);

use App\Enums\ContactRequestStatus;
use App\Models\ContactRequest;
use Carbon\CarbonImmutable;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-17 12:00:00', 'UTC'));
});

function pruneContactRequests(): void
{
    test()->artisan('model:prune', ['--model' => [ContactRequest::class]])->assertSuccessful();
}

test('closed requests past the retention window are deleted, the rest are kept', function () {
    config(['contact.retention_days' => 180]);

    $expired = ContactRequest::factory()->closed()->create(['closed_at' => now()->subDays(181)]);
    $recent = ContactRequest::factory()->closed()->create(['closed_at' => now()->subDays(179)]);
    $oldButOpen = ContactRequest::factory()->create([
        'status' => ContactRequestStatus::InProgress,
        'created_at' => now()->subYears(2),
    ]);

    pruneContactRequests();

    expect(ContactRequest::query()->pluck('id')->sort()->values()->all())
        ->toBe([$recent->id, $oldButOpen->id]);
    expect(ContactRequest::query()->find($expired->id))->toBeNull();
});

test('a retention of 0 keeps closed requests forever', function () {
    config(['contact.retention_days' => 0]);
    ContactRequest::factory()->closed()->create(['closed_at' => now()->subYears(5)]);

    pruneContactRequests();

    expect(ContactRequest::query()->count())->toBe(1);
});

test('the prune of contact requests runs daily in the schedule', function () {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn (Event $event): bool => str_contains((string) $event->command, 'model:prune')
            && str_contains((string) $event->command, 'ContactRequest'));

    expect($events)->toHaveCount(1);
    expect($events->sole()->expression)->toBe('0 0 * * *');
});
