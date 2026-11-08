<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\ExternalSource;
use App\Mail\ExternalSources\ExternalSourceOutageMail;
use App\Mail\ExternalSources\ExternalSourceRecoveredMail;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;

/**
 * An outage of an external source (#419, #425): from the first failure that pauses it to the first answer its adapter
 * reads again. Once it has lasted the source's configured minutes the team gets one mail, and another when it ends.
 * Only a real adapter records one; nothing here ever holds what was looked up.
 */
final readonly class ExternalSourceOutage
{
    /**
     * How long a transition waits for another one in flight before leaving it to the next failure or answer.
     */
    private const int LOCK_WAIT_SECONDS = 3;

    public function __construct(
        private ExternalSource $source,
    ) {}

    public function ongoing(): bool
    {
        return Cache::has($this->source->outageKey());
    }

    /**
     * A failure: starts the outage unless one is recorded, keeps its last step, and mails the team the first time the
     * outage reaches the threshold.
     *
     * @param  string  $step  what failed, as the source's unavailable exception names it
     * @param  bool  $needsResults  the failure doesn't rule out a readable answer without results (a page or a format
     *                              the adapter can't read): from then on only an answer with results ends the outage
     */
    public function failed(string $step, bool $needsResults = false): void
    {
        $this->transition(function () use ($step, $needsResults): void {
            $now = CarbonImmutable::now();
            $outage = $this->recorded() ?? ['started_at' => $now->getTimestamp(), 'alerted' => false, 'needs_results' => false];
            $outage['step'] = $step;
            $outage['needs_results'] = $outage['needs_results'] || $needsResults;
            $startedAt = CarbonImmutable::createFromTimestamp($outage['started_at']);

            if (! $outage['alerted'] && $startedAt->diffInMinutes($now) >= Config::integer($this->source->configKey().'.outage_alert_minutes')) {
                $outage['alerted'] = true;
                $this->mail(new ExternalSourceOutageMail($this->source, $startedAt, $step));
            }

            Cache::forever($this->source->outageKey(), $outage);
        });
    }

    /**
     * An answer the adapter could read: ends the outage, and mails the team when it had been told of it. Without results
     * it leaves an outage that needs them.
     */
    public function answered(bool $withResults = false): void
    {
        // Every lookup answers: only one during an outage pays for the lock.
        if (! $this->ongoing()) {
            return;
        }

        $this->transition(function () use ($withResults): void {
            $outage = $this->recorded();

            if ($outage !== null && $outage['needs_results'] && ! $withResults) {
                return;
            }

            Cache::forget($this->source->outageKey());

            if ($outage !== null && $outage['alerted']) {
                $this->mail(new ExternalSourceRecoveredMail($this->source, CarbonImmutable::createFromTimestamp($outage['started_at']), CarbonImmutable::now()));
            }
        });
    }

    /**
     * @return array{started_at: int, alerted: bool, needs_results: bool, step: string}|null
     */
    private function recorded(): ?array
    {
        $outage = Cache::get($this->source->outageKey());

        if (! is_array($outage) || ! is_int($outage['started_at'] ?? null) || ! is_bool($outage['alerted'] ?? null)) {
            return null;
        }

        return [
            'started_at' => $outage['started_at'],
            'alerted' => $outage['alerted'],
            'needs_results' => ($outage['needs_results'] ?? false) === true,
            'step' => is_string($outage['step'] ?? null) ? $outage['step'] : 'response',
        ];
    }

    /**
     * One transition at a time, so two failures at once start one outage and mail once. A transition that can't get
     * its turn is dropped: the outage stays as the other one left it, and the next failure or answer moves it on.
     */
    private function transition(callable $change): void
    {
        try {
            Cache::lock($this->source->outageKey().':lock', 10)->block(self::LOCK_WAIT_SECONDS, $change);
        } catch (LockTimeoutException) {
            // Left to the next failure or answer.
        }
    }

    /**
     * The team's address, the contact form's (config/contact.php): no source has its own. Without it, no mail.
     */
    private function mail(ExternalSourceOutageMail|ExternalSourceRecoveredMail $mail): void
    {
        $address = Config::get('contact.notification_email');

        if (is_string($address) && $address !== '') {
            Mail::to($address)->queue($mail);
        }
    }
}
