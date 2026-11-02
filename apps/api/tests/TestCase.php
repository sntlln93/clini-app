<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    /** What the fake Have I Been Pwned answers for any hash prefix: no breached password by default. */
    private string $pwnedPasswordsRange = '';

    protected function setUp(): void
    {
        parent::setUp();

        // No test reaches a third party: an HTTP call without a fake fails. CI also runs the suite with the national
        // medication search on (#377), and this keeps that run off the real source.
        Http::preventStrayRequests();

        // The password policy's breach check (#389) asks Have I Been Pwned on every password chosen.
        Http::fake([
            'api.pwnedpasswords.com/range/*' => fn () => Http::response($this->pwnedPasswordsRange),
        ]);
    }

    /**
     * Makes the fake Have I Been Pwned report `$password` as breached.
     */
    public function reportBreachedPassword(string $password): void
    {
        $this->pwnedPasswordsRange = substr(strtoupper(sha1($password)), 5).":42\r\nABCDEF0123456789ABCDEF0123456789ABC:1";
    }
}
