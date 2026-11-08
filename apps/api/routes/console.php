<?php

declare(strict_types=1);

use App\Enums\ExternalSource;
use App\Models\ContactRequest;
use App\Support\ExternalSourceOutage;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('reminders:send-due')->everyMinute()->withoutOverlapping();

Schedule::command('holidays:sync')->monthly()->withoutOverlapping();

Schedule::command('subscriptions:expire-grace')->daily()->withoutOverlapping();

// Professionals' licenses, checked again against the national registry (#380).
Schedule::command('professionals:reverify-licenses')->daily()->withoutOverlapping();

// The national registry, probed hourly and every 5 minutes during an outage, so its start and end are seen without traffic (#419).
Schedule::command('professionals:probe-registry')
    ->everyFiveMinutes()
    ->when(fn (): bool => now()->minute < 5 || (new ExternalSourceOutage(ExternalSource::ProfessionalRegistry))->ongoing())
    ->withoutOverlapping();

// The national medication search, probed hourly and every 5 minutes during an outage, so its start and end are seen without traffic (#425).
// With the search off the command only forgets an outage recorded before.
Schedule::command('medications:probe-source')
    ->everyFiveMinutes()
    ->when(fn (): bool => now()->minute < 5 || (new ExternalSourceOutage(ExternalSource::MedicationSearch))->ongoing())
    ->withoutOverlapping();

// Clinic users' own account deletions whose grace period ended (#384).
Schedule::command('accounts:complete-deletions')->hourly()->withoutOverlapping();

// Closed contact requests past their retention window (config/contact.php).
Schedule::command('model:prune', ['--model' => [ContactRequest::class]])->daily()->withoutOverlapping();

// Password reset tokens past their 60 minutes (config/auth.php, #389): each row holds the user's email.
Schedule::command('auth:clear-resets')->daily()->withoutOverlapping();

// Replaced or removed uploaded files past their retention window (config/filesystems.php, #410).
Schedule::command('media:delete-due')->daily()->withoutOverlapping();

// Failed jobs past their retention window (config/queue.php).
Schedule::command('queue:prune-failed', ['--hours' => config('queue.failed.retention_hours')])->daily()->withoutOverlapping();
