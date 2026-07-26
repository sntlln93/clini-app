<?php

declare(strict_types=1);

use App\Enums\MembershipStatus;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;

test('Test User ends up with exactly one active membership in exactly one organization', function () {
    $this->seed(DatabaseSeeder::class);

    $user = User::where('email', 'test@example.com')->firstOrFail();

    $memberships = $user->memberships;

    expect($memberships)->toHaveCount(1);
    expect($memberships->pluck('organization_id')->unique())->toHaveCount(1);
    expect($memberships->first()->status)->toBe(MembershipStatus::Active);
});

test('an authenticated Test User can list patients instead of getting a 403 from the organization middleware', function () {
    $this->seed(DatabaseSeeder::class);

    $user = User::where('email', 'test@example.com')->firstOrFail();

    $response = $this->actingAs($user)->getJson('/api/v1/patients');

    $response->assertOk();
});
