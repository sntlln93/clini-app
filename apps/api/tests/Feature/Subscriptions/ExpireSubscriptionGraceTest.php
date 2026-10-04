<?php

declare(strict_types=1);

use App\Enums\SubscriptionStatus;
use App\Models\Membership;
use App\Models\Subscription;
use App\Notifications\Subscriptions\SubscriptionExpiredNotification;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
    Date::setTestNow('2026-10-03 12:00:00');
});

afterEach(function () {
    Date::setTestNow();
});

test('a grace period that has ended expires the subscription and notifies its owners', function () {
    $subscription = Subscription::factory()->inGrace(now()->subMinute())->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $subscription->organization_id]);
    $admin = Membership::factory()->admin()->create(['organization_id' => $subscription->organization_id]);

    $this->artisan('subscriptions:expire-grace')->assertSuccessful();

    $subscription->refresh();
    expect($subscription->status)->toBe(SubscriptionStatus::Expired);
    expect($subscription->grace_reason)->toBeNull();
    Notification::assertSentTo($owner->user, SubscriptionExpiredNotification::class);
    Notification::assertNotSentTo($admin->user, SubscriptionExpiredNotification::class);
});

test('a grace period still running is left untouched', function () {
    $subscription = Subscription::factory()->inGrace(now()->addHour())->create();
    Membership::factory()->owner()->create(['organization_id' => $subscription->organization_id]);

    $this->artisan('subscriptions:expire-grace')->assertSuccessful();

    expect($subscription->fresh()->status)->toBe(SubscriptionStatus::Grace);
    Notification::assertNothingSent();
});

test('subscriptions outside grace are never expired', function (SubscriptionStatus $status) {
    $subscription = Subscription::factory()->withStatus($status)->create(['grace_ends_at' => now()->subDay()]);

    $this->artisan('subscriptions:expire-grace')->assertSuccessful();

    expect($subscription->fresh()->status)->toBe($status);
    Notification::assertNothingSent();
})->with([SubscriptionStatus::Active, SubscriptionStatus::Pending, SubscriptionStatus::Cancelled]);

test('the expiry command is scheduled daily', function () {
    $event = collect(app(Schedule::class)->events())
        ->first(fn ($event): bool => str_contains((string) $event->command, 'subscriptions:expire-grace'));

    expect($event)->not->toBeNull();
    expect($event->expression)->toBe('0 0 * * *');
});

test('the expiry notification mail is in Spanish and links to the settings page', function () {
    $subscription = Subscription::factory()->inGrace(now()->subMinute())->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $subscription->organization_id]);

    $this->artisan('subscriptions:expire-grace');

    Notification::assertSentTo($owner->user, SubscriptionExpiredNotification::class, function (SubscriptionExpiredNotification $notification) use ($owner): bool {
        $mail = $notification->toMail($owner->user);

        return $notification instanceof ShouldQueue
            && $mail->subject === 'Tu suscripción a Clini venció'
            && str_ends_with((string) $mail->actionUrl, '/ajustes')
            && $notification->via($owner->user) === ['mail'];
    });
});
