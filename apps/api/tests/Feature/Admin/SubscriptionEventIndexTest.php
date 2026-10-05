<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;

afterEach(function () {
    freshRequestState();
});

/**
 * @param  array<string, mixed>  $payload
 */
function providerEvent(string $notificationId, ?Subscription $subscription, string $type = 'payment', array $payload = ['id' => 'x']): SubscriptionEvent
{
    return SubscriptionEvent::query()->create([
        'provider' => 'mercadopago',
        'notification_id' => $notificationId,
        'type' => $type,
        'resource_id' => 'res-'.$notificationId,
        'subscription_id' => $subscription?->id,
        'payload' => $payload,
    ]);
}

test('events are listed newest first with their organization and payload object', function () {
    $organization = Organization::factory()->create(['name' => 'Consultorio Pagos']);
    $subscription = Subscription::factory()->create(['organization_id' => $organization->id]);
    providerEvent('n-1', $subscription, 'payment', ['data' => ['id' => '123'], 'action' => 'payment.created']);
    $orphan = providerEvent('n-2', null, 'subscription_preapproval');

    $response = actingAsAdmin()->getJson('/api/v1/admin/subscription-events');

    $response->assertOk();
    expect($response->json('data.0.id'))->toBe($orphan->id);
    expect($response->json('data.0.organization'))->toBeNull();
    expect($response->json('data.1'))->toMatchArray([
        'provider' => 'mercadopago',
        'notification_id' => 'n-1',
        'type' => 'payment',
        'resource_id' => 'res-n-1',
        'subscription_id' => $subscription->id,
        'organization' => ['id' => $organization->id, 'name' => 'Consultorio Pagos'],
        'payload' => ['data' => ['id' => '123'], 'action' => 'payment.created'],
    ]);
});

test('events filter by subscription_id, organization_id and type', function () {
    $first = Subscription::factory()->create();
    $second = Subscription::factory()->create();
    providerEvent('a', $first, 'payment');
    providerEvent('b', $first, 'subscription_preapproval');
    providerEvent('c', $second, 'payment');

    $ids = fn (string $query): array => array_column(actingAsAdmin()->getJson('/api/v1/admin/subscription-events?'.$query)->json('data'), 'notification_id');

    expect($ids("subscription_id={$first->id}"))->toEqualCanonicalizing(['a', 'b']);
    freshRequestState();
    expect($ids("organization_id={$second->organization_id}"))->toBe(['c']);
    freshRequestState();
    expect($ids('type=payment'))->toEqualCanonicalizing(['a', 'c']);
    freshRequestState();
    expect($ids("subscription_id={$first->id}&type=payment"))->toBe(['a']);
});

test('an empty payload is still an object', function () {
    providerEvent('vacio', null, 'payment', []);

    $response = actingAsAdmin()->getJson('/api/v1/admin/subscription-events');

    expect($response->getContent())->toContain('"payload":{}');
});

test('unknown subscription_id or organization_id is a 422', function () {
    actingAsAdmin()->getJson('/api/v1/admin/subscription-events?subscription_id=999999')
        ->assertStatus(422)->assertJsonValidationErrors(['subscription_id']);
    freshRequestState();
    actingAsAdmin()->getJson('/api/v1/admin/subscription-events?organization_id=999999')
        ->assertStatus(422)->assertJsonValidationErrors(['organization_id']);
});
