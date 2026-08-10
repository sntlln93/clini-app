<?php

declare(strict_types=1);

use App\Support\CurrentOrganization;
use Symfony\Component\HttpKernel\Exception\HttpException;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('getOrFail returns the id when one has been set', function () {
    app(CurrentOrganization::class)->set(42);

    expect(app(CurrentOrganization::class)->getOrFail())->toBe(42);
});

test('getOrFail aborts with 403 when nothing is set', function () {
    try {
        app(CurrentOrganization::class)->getOrFail();
        $this->fail('Expected HttpException was not thrown.');
    } catch (HttpException $exception) {
        expect($exception->getStatusCode())->toBe(403);
    }
});
