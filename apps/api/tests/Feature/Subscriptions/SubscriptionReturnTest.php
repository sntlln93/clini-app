<?php

declare(strict_types=1);

beforeEach(function () {
    config(['cors.allowed_origins' => ['https://panel.example.com']]);
});

test('the checkout return route redirects a guest to the panel settings, flagged as a return', function () {
    $this->get('/api/v1/subscription/return')
        ->assertRedirect('https://panel.example.com/ajustes?suscripcion=retorno');
});

test('the checkout return route ignores every query parameter the provider or anyone appends', function () {
    $response = $this->get('/api/v1/subscription/return?preapproval_id=pre-1&redirect=https://evil.example.com&next=//evil.example.com');

    $response->assertRedirect('https://panel.example.com/ajustes?suscripcion=retorno');
    expect($response->headers->get('Location'))
        ->not->toContain('evil')
        ->not->toContain('pre-1');
});
