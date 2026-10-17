<?php

declare(strict_types=1);

use App\Enums\SubscriptionBilling;
use App\Support\PracticePricing;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    config([
        'plans.practice.base_amount' => 15001,
        'plans.practice.included_professionals' => 5,
        'plans.practice.extra_professional_amount' => 0,
        'plans.practice.annual_discount_percent' => 40,
    ]);
});

test('the yearly amount is twelve discounted months, each rounded to whole pesos', function () {
    // $15.001 × 60% = $9.000,60 → $9.001 a month.
    expect(app(PracticePricing::class)->amount(1, SubscriptionBilling::Annual))->toBe(108012);
    expect(app(PracticePricing::class)->amount(1, SubscriptionBilling::Monthly))->toBe(15001);
});

test('the annual discount is clamped between none and all of it', function (int $configured, int $expected) {
    config(['plans.practice.annual_discount_percent' => $configured]);

    expect(app(PracticePricing::class)->annualDiscountPercent())->toBe($expected);
})->with([
    'negative' => [-10, 0],
    'in range' => [40, 40],
    'above 100' => [150, 100],
]);

test('the monthly equivalent of a yearly charge spreads it over twelve months', function () {
    expect(app(PracticePricing::class)->monthlyEquivalent(108000, SubscriptionBilling::Annual))->toBe(9000);
    expect(app(PracticePricing::class)->monthlyEquivalent(15000, SubscriptionBilling::Monthly))->toBe(15000);
});
