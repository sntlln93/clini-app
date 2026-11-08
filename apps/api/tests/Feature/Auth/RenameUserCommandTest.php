<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\User;

/**
 * `user:rename` (#417): support's way to change a name, the only one for an account whose name the registry gave.
 */
test('support renames a user, and nothing else does', function () {
    $user = Membership::factory()->professional()->create()->user;
    $user->forceFill(['name' => 'Lucia De La Fuente', 'document_number' => '99000003'])->save();

    $this->artisan('user:rename', ['email' => mb_strtoupper($user->email), 'name' => '  Lucía  de la Fuente '])
        ->expectsConfirmation('¿Cambiar el nombre de este usuario a «Lucía de la Fuente»?', 'yes')
        ->doesntExpectOutputToContain('99000003')
        ->assertSuccessful();

    expect($user->refresh()->name)->toBe('Lucía de la Fuente');

    // There is no endpoint where a user writes their own name.
    $this->actingAs($user)->putJson('/api/v1/me', ['name' => 'Otro'])->assertMethodNotAllowed();
    $this->actingAs($user)->patchJson('/api/v1/me', ['name' => 'Otro'])->assertMethodNotAllowed();
});

test('support can\'t rename an unknown user, nor to an empty name', function (string $email, string $name) {
    $user = User::factory()->create(['name' => 'Ana']);

    $this->artisan('user:rename', ['email' => $email === 'own' ? $user->email : $email, 'name' => $name])->assertFailed();

    expect($user->refresh()->name)->toBe('Ana');
})->with([['nadie@example.com', 'Ana Pérez'], ['own', '   ']]);
