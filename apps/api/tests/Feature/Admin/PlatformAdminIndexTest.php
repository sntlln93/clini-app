<?php

declare(strict_types=1);

use App\Models\PlatformAdmin;

afterEach(function () {
    freshRequestState();
});

test('platform admins are listed by name as refs, unpaginated', function () {
    $zoe = PlatformAdmin::factory()->create(['name' => 'Zoe']);
    $ana = PlatformAdmin::factory()->create(['name' => 'Ana']);

    $response = actingAsAdmin(PlatformAdmin::factory()->create(['name' => 'Marta']))->getJson('/api/v1/admin/platform-admins');

    $response->assertOk();
    expect(array_column($response->json('data'), 'name'))->toBe(['Ana', 'Marta', 'Zoe']);
    expect($response->json('data.0'))->toBe(['id' => $ana->id, 'name' => 'Ana', 'email' => $ana->email]);
    expect($response->json())->not->toHaveKey('meta');
    expect($zoe->id)->toBeInt();
});
