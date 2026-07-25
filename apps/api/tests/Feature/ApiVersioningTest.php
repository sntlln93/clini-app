<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

test('every registered api route is versioned under api/v1', function () {
    $apiUris = collect(Route::getRoutes())
        ->map(fn ($route) => $route->uri())
        ->filter(fn (string $uri) => str_starts_with($uri, 'api/'))
        ->values();

    expect($apiUris)->not->toBeEmpty();

    $unversioned = $apiUris->reject(fn (string $uri) => str_starts_with($uri, 'api/v1/'));

    expect($unversioned)->toBeEmpty(
        'Unversioned api route(s) found outside api/v1: '.$unversioned->implode(', ')
    );
});

test('the sanctum csrf cookie route stays outside the api prefix', function () {
    $uris = collect(Route::getRoutes())->map(fn ($route) => $route->uri());

    expect($uris)->toContain('sanctum/csrf-cookie');

    $csrfUri = $uris->first(fn (string $uri) => $uri === 'sanctum/csrf-cookie');

    expect(str_starts_with($csrfUri, 'api/'))->toBeFalse();
});

test('the expected v1 routes are registered', function () {
    $uris = collect(Route::getRoutes())->map(fn ($route) => $route->uri());

    expect($uris)->toContain('api/v1/ping');
    expect($uris)->toContain('api/v1/login');
    expect($uris)->toContain('api/v1/register');
    expect($uris)->toContain('api/v1/logout');
    expect($uris)->toContain('api/v1/me');
});
