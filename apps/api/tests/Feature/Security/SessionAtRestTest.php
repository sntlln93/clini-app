<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Patient;
use App\Support\CurrentOrganization;

// The session payload sits in the `sessions` table (SESSION_DRIVER=database),
// so it is personal data at rest: it holds the guards' ids and, until #358,
// the full URL of the last GET, query string included (`?q=<name or DNI>`).
// See docs/architecture/security.md.

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * Loads config/session.php as if SESSION_ENCRYPT held $value (null: unset).
 *
 * @return array<string, mixed>
 */
function sessionConfigWithEncrypt(?string $value): array
{
    // env() reads $_SERVER, then $_ENV, then getenv(): set or clear all three.
    $previous = [$_SERVER['SESSION_ENCRYPT'] ?? null, $_ENV['SESSION_ENCRYPT'] ?? null, getenv('SESSION_ENCRYPT')];

    $set = function (?string $server, ?string $env, string|false $process): void {
        if ($server === null) {
            unset($_SERVER['SESSION_ENCRYPT']);
        } else {
            $_SERVER['SESSION_ENCRYPT'] = $server;
        }

        if ($env === null) {
            unset($_ENV['SESSION_ENCRYPT']);
        } else {
            $_ENV['SESSION_ENCRYPT'] = $env;
        }

        putenv($process === false ? 'SESSION_ENCRYPT' : "SESSION_ENCRYPT={$process}");
    };

    $set($value, $value, $value ?? false);

    try {
        /** @var array<string, mixed> $config */
        $config = require config_path('session.php');

        return $config;
    } finally {
        $set(...$previous);
    }
}

test('the session is encrypted unless SESSION_ENCRYPT turns it off explicitly', function () {
    expect(sessionConfigWithEncrypt(null)['encrypt'])->toBeTrue()
        ->and(sessionConfigWithEncrypt('true')['encrypt'])->toBeTrue()
        ->and(sessionConfigWithEncrypt('false')['encrypt'])->toBeFalse();
});

test('.env.example ships with the session encrypted', function () {
    $example = (string) file_get_contents(base_path('.env.example'));

    expect($example)->toMatch('/^SESSION_ENCRYPT=true$/m')
        ->not->toMatch('/^SESSION_ENCRYPT=false$/m');
});

test('a stateful GET does not leave its URL in the session', function () {
    $membership = Membership::factory()->create();
    Patient::factory()->create(['name' => 'Maria Gonzalez'])
        ->organizations()->attach($membership->organization_id);

    fromPanel()->actingAs($membership->user)
        ->getJson('/api/v1/patients?q=Gonzalez')
        ->assertOk();

    expect(session()->has('_token'))->toBeTrue()
        ->and(session()->previousUrl())->toBeNull()
        ->and(json_encode(session()->all()))->not->toContain('Gonzalez');
});
