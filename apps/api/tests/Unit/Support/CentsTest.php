<?php

declare(strict_types=1);

use App\Support\Cents;

test('an amount in pesos is kept in whole cents', function (mixed $amount, int $cents) {
    expect(Cents::fromAmount($amount))->toBe($cents);
})->with([
    'an integer' => [15000, 1500000],
    'a float with cents' => [18500.5, 1850050],
    'a float that is not exact in binary' => [0.29, 29],
    'a numeric string' => ['15000.50', 1500050],
    'a whole amount right under the bound' => [90_071_992_547_409, 9_007_199_254_740_900],
]);

test('what is not an amount, or is beyond what the panel reads exactly, is none', function (mixed $amount) {
    expect(Cents::fromAmount($amount))->toBeNull();
})->with([
    'nothing' => [null],
    'a word' => ['quince'],
    'a boolean' => [true],
    'past 2^53 cents' => [90_071_992_547_410.0],
    'past what an int holds' => [1.0e17],
    'infinity' => [INF],
    'not a number' => [NAN],
]);
