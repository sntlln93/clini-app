<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // No test reaches a third party: an HTTP call without a fake fails. CI also runs the suite with the national
        // medication search on (#377), and this keeps that run off the real source.
        Http::preventStrayRequests();
    }
}
