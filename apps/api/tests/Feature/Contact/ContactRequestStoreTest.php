<?php

declare(strict_types=1);

use App\Enums\ContactRequestStatus;
use App\Enums\Plan;
use App\Mail\Contact\ContactRequestReceivedMail;
use App\Models\ContactRequest;
use Illuminate\Support\Facades\Mail;
use Illuminate\Testing\TestResponse;

const LANDING_ORIGIN = 'http://localhost:5176';

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function contactPayload(array $overrides = []): array
{
    return [
        'name' => 'Laura Gómez',
        'email' => 'laura@centro.test',
        'phone' => '11 5555-0000',
        'organization_name' => 'Centro Médico Norte',
        'team_size' => 12,
        'plan' => 'center',
        'message' => 'Somos 12 profesionales y queremos migrar la agenda.',
        ...$overrides,
    ];
}

function postContact(array $payload): TestResponse
{
    return test()->withHeaders(['Origin' => LANDING_ORIGIN])->postJson('/api/v1/contact', $payload);
}

beforeEach(function () {
    Mail::fake();
});

test('a visitor sends a request, which is stored as new with nothing handled yet', function () {
    postContact(contactPayload([
        'name' => '  Laura Gómez ',
        'email' => ' laura@centro.test',
    ]))->assertNoContent();

    $request = ContactRequest::query()->sole();
    expect($request->name)->toBe('Laura Gómez');
    expect($request->email)->toBe('laura@centro.test');
    expect($request->phone)->toBe('11 5555-0000');
    expect($request->organization_name)->toBe('Centro Médico Norte');
    expect($request->team_size)->toBe(12);
    expect($request->plan)->toBe(Plan::Center);
    expect($request->status)->toBe(ContactRequestStatus::New);
    expect($request->handled_by_id)->toBeNull();
    expect($request->closed_at)->toBeNull();
});

test('only the name, email and message are required', function () {
    postContact([
        'name' => 'Laura',
        'email' => 'laura@centro.test',
        'message' => 'Hola',
    ])->assertNoContent();

    $request = ContactRequest::query()->sole();
    expect($request->phone)->toBeNull();
    expect($request->organization_name)->toBeNull();
    expect($request->team_size)->toBeNull();
    expect($request->plan)->toBeNull();
});

test('invalid input is a 422 with Spanish messages and stores nothing', function (array $overrides, string $field, string $message) {
    postContact(contactPayload($overrides))
        ->assertStatus(422)
        ->assertJsonValidationErrors([$field => $message]);

    expect(ContactRequest::query()->count())->toBe(0);
})->with([
    'no name' => [['name' => ''], 'name', 'Ingresá tu nombre.'],
    'long name' => [['name' => str_repeat('a', 121)], 'name', 'El nombre puede tener hasta 120 caracteres.'],
    'no email' => [['email' => ''], 'email', 'Ingresá tu correo.'],
    'bad email' => [['email' => 'laura'], 'email', 'Ingresá un correo válido.'],
    'email the mailer rejects' => [['email' => 'a(comment)@example.com'], 'email', 'Ingresá un correo válido.'],
    'long phone' => [['phone' => str_repeat('1', 41)], 'phone', 'El teléfono puede tener hasta 40 caracteres.'],
    'zero team' => [['team_size' => 0], 'team_size', 'Ingresá al menos 1 profesional.'],
    'unknown plan' => [['plan' => 'enterprise'], 'plan', 'Elegí un plan de la lista.'],
    'no message' => [['message' => ' '], 'message', 'Contanos en qué te podemos ayudar.'],
    'long message' => [['message' => str_repeat('a', 2001)], 'message', 'El mensaje puede tener hasta 2000 caracteres.'],
]);

test('a filled honeypot gets the same answer but stores and mails nothing', function () {
    config(['contact.notification_email' => 'ventas@clini.test']);

    postContact(contactPayload(['website' => 'https://spam.test']))->assertNoContent();

    expect(ContactRequest::query()->count())->toBe(0);
    Mail::assertNothingOutgoing();
});

test('the request is stateless: no session or CSRF for the landing origin', function () {
    $response = postContact(contactPayload())->assertNoContent();

    expect($response->headers->getCookies())->toBe([]);
});

test('the landing origin is allowed by CORS', function () {
    $this->withHeaders([
        'Origin' => LANDING_ORIGIN,
        'Access-Control-Request-Method' => 'POST',
        'Access-Control-Request-Headers' => 'content-type',
    ])->options('/api/v1/contact')
        ->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', LANDING_ORIGIN);
});

test('the team gets a mail that replies to the visitor when an address is configured', function () {
    config(['contact.notification_email' => 'ventas@clini.test']);

    postContact(contactPayload())->assertNoContent();

    Mail::assertQueued(ContactRequestReceivedMail::class, function (ContactRequestReceivedMail $mail): bool {
        $rendered = $mail->render();

        return $mail->hasTo('ventas@clini.test')
            && $mail->hasReplyTo('laura@centro.test', 'Laura Gómez')
            && $mail->envelope()->subject === 'Nueva consulta comercial de Laura Gómez'
            && str_contains($rendered, 'Centro Médico Norte')
            && str_contains($rendered, 'Plan de interés:</strong> Centro')
            && str_contains($rendered, 'http://localhost:5175/contactos');
    });
});

test('no mail goes out without a configured address', function () {
    postContact(contactPayload())->assertNoContent();

    expect(ContactRequest::query()->count())->toBe(1);
    Mail::assertNothingOutgoing();
});

test('the sixth request within a minute from the same ip is throttled', function () {
    foreach (range(1, 5) as $attempt) {
        postContact(contactPayload())->assertNoContent();
    }

    postContact(contactPayload())
        ->assertStatus(429)
        ->assertHeader('Retry-After');

    expect(ContactRequest::query()->count())->toBe(5);
});

test('the minute limit resets, but an ip gets at most 20 requests an hour', function () {
    foreach (range(1, 4) as $minute) {
        foreach (range(1, 5) as $attempt) {
            postContact(contactPayload())->assertNoContent();
        }
        $this->travel(61)->seconds();
    }

    postContact(contactPayload())->assertStatus(429);
    expect(ContactRequest::query()->count())->toBe(20);

    $this->travel(1)->hours();
    postContact(contactPayload())->assertNoContent();
});

test('another ip has its own limit', function () {
    foreach (range(1, 5) as $attempt) {
        postContact(contactPayload())->assertNoContent();
    }

    $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.2']);
    postContact(contactPayload())->assertNoContent();
});

test('the honeypot counts against the limit too', function () {
    foreach (range(1, 5) as $attempt) {
        postContact(contactPayload(['website' => 'x']))->assertNoContent();
    }

    postContact(contactPayload())->assertStatus(429);
});
