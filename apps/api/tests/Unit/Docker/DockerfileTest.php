<?php

declare(strict_types=1);

// The production image is what Dokploy builds: a floating tag would keep a
// cached, unpatched PHP-FPM (PHP2Shell, fixed in 8.5.12) and leave no record
// of which version runs (#349).

function apiDockerfile(): string
{
    return (string) file_get_contents(dirname(__DIR__, 3).'/Dockerfile');
}

test('every base image is pinned down to the patch', function () {
    preg_match_all('/^FROM\s+(\S+)/m', apiDockerfile(), $matches);

    expect($matches[1])->not->toBeEmpty();
    foreach ($matches[1] as $image) {
        expect($image)->toMatch('/:v?\d+\.\d+\.\d+(-[\w.-]+)?$/');
    }
});

test('the runtime image runs PHP 8.5.12 or later', function () {
    preg_match('/^FROM\s+php:(\d+\.\d+\.\d+)-fpm-alpine\b/m', apiDockerfile(), $match);

    expect($match)->not->toBeEmpty()
        ->and(version_compare($match[1], '8.5.12', '>='))->toBeTrue();
});

test('the runtime image turns off upload progress and fatal error backtraces', function () {
    $dockerfile = apiDockerfile();

    expect($dockerfile)
        ->toContain('session.upload_progress.enabled=0')
        ->toContain('fatal_error_backtraces=0');
});
