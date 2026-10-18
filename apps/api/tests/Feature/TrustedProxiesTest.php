<?php

declare(strict_types=1);

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;

const PROXY_IP = '10.0.1.5';
const VISITOR_IP = '190.104.12.34';

/**
 * Loads config/trustedproxy.php as if TRUSTED_PROXIES held $value.
 *
 * @return array<int, string>
 */
function trustedProxiesFor(?string $value): array
{
    // env() reads $_SERVER, then $_ENV, then getenv(): set or clear all three.
    $previous = [$_SERVER['TRUSTED_PROXIES'] ?? null, $_ENV['TRUSTED_PROXIES'] ?? null, getenv('TRUSTED_PROXIES')];

    $set = function (?string $server, ?string $env, string|false $process): void {
        if ($server === null) {
            unset($_SERVER['TRUSTED_PROXIES']);
        } else {
            $_SERVER['TRUSTED_PROXIES'] = $server;
        }

        if ($env === null) {
            unset($_ENV['TRUSTED_PROXIES']);
        } else {
            $_ENV['TRUSTED_PROXIES'] = $env;
        }

        putenv($process === false ? 'TRUSTED_PROXIES' : "TRUSTED_PROXIES={$process}");
    };

    $set($value, $value, $value ?? false);

    try {
        /** @var array{proxies: array<int, string>} $config */
        $config = require config_path('trustedproxy.php');

        return $config['proxies'];
    } finally {
        $set(...$previous);
    }
}

/**
 * @param  array<string, string>  $headers
 */
function requestFrom(string $remoteAddr, array $headers = [], string $host = 'localhost'): TestResponse
{
    return test()->withServerVariables(['REMOTE_ADDR' => $remoteAddr])
        ->withHeaders($headers)
        ->getJson("http://{$host}/api/v1/_test/client");
}

beforeEach(function () {
    Route::get('/api/v1/_test/client', fn (Request $request): array => [
        'ip' => $request->ip(),
        'secure' => $request->isSecure(),
        'host' => $request->getHost(),
        'base_url' => $request->getBaseUrl(),
    ]);
});

test('the shipped default trusts no proxy', function () {
    expect(trustedProxiesFor(null))->toBe([])
        ->and(trustedProxiesFor(''))->toBe([])
        ->and(config('trustedproxy.proxies'))->toBe([]);
});

test('TRUSTED_PROXIES is read as a comma-separated list of addresses', function () {
    expect(trustedProxiesFor(' 10.0.1.0/24, 192.168.5.7 ,,'))->toBe(['10.0.1.0/24', '192.168.5.7']);
});

test('a value that would trust whoever connects is dropped', function (string $value) {
    expect(trustedProxiesFor($value))->toBe([]);
})->with(['*', '**', 'REMOTE_ADDR', ' * , REMOTE_ADDR ']);

test('without a trusted proxy, forwarded headers are ignored', function () {
    requestFrom(PROXY_IP, [
        'X-Forwarded-For' => VISITOR_IP,
        'X-Forwarded-Proto' => 'https',
    ])->assertOk()->assertJson(['ip' => PROXY_IP, 'secure' => false]);
});

// Laravel's middleware trusts every proxy when its config is null and the
// Host ends in .on-forge.com or .on-vapor.com; the config's empty array
// keeps a client from turning that on with its own Host header.
test('a client cannot get its forwarded headers trusted through the Host header', function (string $host) {
    requestFrom(PROXY_IP, ['X-Forwarded-For' => VISITOR_IP], $host)
        ->assertOk()->assertJson(['ip' => PROXY_IP, 'host' => $host]);
})->with(['clini.on-forge.com', 'clini.on-vapor.com']);

test('behind a trusted proxy the API sees the visitor and the original scheme and host', function () {
    config(['trustedproxy.proxies' => ['10.0.1.0/24']]);

    requestFrom(PROXY_IP, [
        'X-Forwarded-For' => VISITOR_IP,
        'X-Forwarded-Proto' => 'https',
        'X-Forwarded-Host' => 'api.clini.test',
        'X-Forwarded-Port' => '443',
    ])->assertOk()->assertJson([
        'ip' => VISITOR_IP,
        'secure' => true,
        'host' => 'api.clini.test',
    ]);
});

test('an address the client prepends to X-Forwarded-For is not believed', function () {
    config(['trustedproxy.proxies' => ['10.0.1.0/24']]);

    // A proxy that keeps the client's header appends the address it saw (Traefik
    // does so only for its forwardedHeaders.trustedIPs): the rightmost wins.
    requestFrom(PROXY_IP, ['X-Forwarded-For' => '203.0.113.66, '.VISITOR_IP])
        ->assertOk()->assertJson(['ip' => VISITOR_IP]);
});

test('a client outside the trusted network cannot forge its address', function () {
    config(['trustedproxy.proxies' => ['10.0.1.0/24']]);

    requestFrom('203.0.113.9', [
        'X-Forwarded-For' => VISITOR_IP,
        'X-Forwarded-Proto' => 'https',
    ])->assertOk()->assertJson(['ip' => '203.0.113.9', 'secure' => false]);
});

test('X-Forwarded-Prefix is not trusted, not even from the proxy', function () {
    config(['trustedproxy.proxies' => ['10.0.1.0/24']]);

    requestFrom(PROXY_IP, ['X-Forwarded-Prefix' => '/forged'])
        ->assertOk()->assertJson(['base_url' => '']);
});

test('behind a trusted proxy each visitor has their own contact form limit', function () {
    config(['trustedproxy.proxies' => ['10.0.1.0/24']]);

    $send = fn (string $visitor): TestResponse => $this->withServerVariables(['REMOTE_ADDR' => PROXY_IP])
        ->withHeaders(['Origin' => 'http://localhost:5176', 'X-Forwarded-For' => $visitor])
        ->postJson('/api/v1/contact', [
            'name' => 'Laura Gómez',
            'email' => 'laura@centro.test',
            'phone' => '11 5555-0000',
            'organization_name' => 'Centro Médico Norte',
            'team_size' => 12,
            'plan' => 'center',
            'message' => 'Somos 12 profesionales y queremos migrar la agenda.',
            // The honeypot: counts against the limit, stores and mails nothing.
            'website' => 'x',
        ]);

    foreach (range(1, 5) as $attempt) {
        $send(VISITOR_IP)->assertNoContent();
    }

    $send(VISITOR_IP)->assertStatus(429);
    $send('181.45.0.7')->assertNoContent();
});
