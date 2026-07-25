<?php

declare(strict_types=1);

test('the application returns a successful response', function () {
    $response = $this->get('/api/v1/ping');

    $response->assertStatus(200);
});
