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
    'a string with one decimal' => ['15000.5', 1500050],
    'a negative amount' => [-150.25, -15025],
    'zero' => ['0.00', 0],
    'a whole amount right under the bound' => [90_071_992_547_409, 9_007_199_254_740_900],
    // A float times 100 would land a cent off at these magnitudes.
    'a string exact to the cent near the bound' => ['80000000000000.01', 8_000_000_000_000_001],
    'the bound itself, as a string' => ['90071992547409.91', Cents::MAX_EXACT],
    'a float just under 2^45 pesos' => [35_184_372_088_831.99, 3_518_437_208_883_199],
]);

test('what is not an amount, or is beyond what the panel reads exactly, is none', function (mixed $amount) {
    expect(Cents::fromAmount($amount))->toBeNull();
})->with([
    'nothing' => [null],
    'a word' => ['quince'],
    'a boolean' => [true],
    'an exponent' => ['1e5'],
    'more than two decimals' => ['15000.505'],
    'one cent past 2^53 - 1, as a string' => ['90071992547409.92'],
    'past 2^53 cents, as an integer' => [90_071_992_547_410],
    'a float no longer exact to the cent' => [80_000_000_000_000.01],
    'past what an int holds' => [1.0e17],
    'infinity' => [INF],
    'not a number' => [NAN],
]);
