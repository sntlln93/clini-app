<?php

declare(strict_types=1);

use App\Support\TwoFactorRecoveryCodes;

test('it generates eight distinct codes without look-alike characters', function () {
    $codes = TwoFactorRecoveryCodes::generate();

    expect($codes)->toHaveCount(TwoFactorRecoveryCodes::COUNT)
        ->and(array_unique($codes))->toHaveCount(TwoFactorRecoveryCodes::COUNT)
        ->each->toMatch('/^[a-hjkmnp-z2-9]{5}-[a-hjkmnp-z2-9]{5}$/');
});

test('it finds a code ignoring case, spaces and the dash', function (string $candidate, ?int $expected) {
    expect(TwoFactorRecoveryCodes::find(['abcde-fghjk', 'mnpqr-stuvw'], $candidate))->toBe($expected);
})->with([
    'exact' => ['mnpqr-stuvw', 1],
    'upper case and spaces' => [' ABCDE FGHJK ', 0],
    'no dash' => ['abcdefghjk', 0],
    'unknown' => ['abcde-fghjm', null],
    'empty' => ['', null],
]);
