<?php

declare(strict_types=1);

use App\Contracts\DomainError;
use App\Enums\AppointmentStatus;
use App\Exceptions\Appointments\AppointmentNotCancellableException;
use App\Exceptions\Appointments\AppointmentNotReschedulableException;
use App\Exceptions\Appointments\ServiceNotActiveForProfessionalException;
use App\Exceptions\Appointments\SlotTakenException;
use App\Exceptions\Appointments\StatusTransitionNotAllowedException;
use App\Exceptions\Memberships\InvitationInvalidOrExpiredException;
use App\Exceptions\Memberships\LastActiveAdminException;
use App\Exceptions\Organizations\NoActiveMembershipException;
use App\Exceptions\Patients\PatientNotFoundException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;

dataset('domain_exceptions', fn () => [
    'ServiceNotActiveForProfessionalException' => new ServiceNotActiveForProfessionalException(501, 502),
    'SlotTakenException' => new SlotTakenException(
        503,
        CarbonImmutable::parse('2026-01-01T10:00:00Z'),
        CarbonImmutable::parse('2026-01-01T10:30:00Z'),
    ),
    'AppointmentNotCancellableException' => new AppointmentNotCancellableException(504, AppointmentStatus::Completed),
    'AppointmentNotReschedulableException' => new AppointmentNotReschedulableException(505, AppointmentStatus::Completed),
    'StatusTransitionNotAllowedException' => new StatusTransitionNotAllowedException(506, AppointmentStatus::Scheduled, AppointmentStatus::Completed),
    'LastActiveAdminException' => new LastActiveAdminException(507, 508),
    'InvitationInvalidOrExpiredException' => new InvitationInvalidOrExpiredException('abcdef0123456789'),
    'NoActiveMembershipException' => new NoActiveMembershipException(509),
    'PatientNotFoundException' => new PatientNotFoundException('dni', '30111222'),
]);

beforeEach(function () {
    // Registered per test, against that test's own Application instance —
    // a top-level registration would only bind to the app created while
    // this file is first loaded, not the fresh app each test boots.
    Route::any('/api/v1/_test/throw-domain-error', function () {
        throw app('test.domain-error.instance');
    });

    Route::any('/api/v1/_test/throw-runtime', function () {
        throw new RuntimeException('internal detail 12345');
    });

    Route::any('/api/v1/_test/abort-500', function () {
        abort(500);
    });

    Route::any('/api/v1/_test/throw-validation', function () {
        throw ValidationException::withMessages([
            'start_at' => ['The start at field is required.'],
        ]);
    });
});

test('the response body matches the exact shape for every concrete domain exception', function (DomainError $exception) {
    app()->instance('test.domain-error.instance', $exception);

    $response = $this->getJson('/api/v1/_test/throw-domain-error');

    $response->assertStatus($exception->httpStatus());
    expect(array_keys($response->json()))->toBe(['error']);
    expect(array_keys($response->json('error')))->toBe(['code', 'message', 'context']);
    expect($response->json('error.code'))->toBe($exception->errorCode()->value);
    expect($response->json('error.message'))->toBe($exception->getMessage());
})->with('domain_exceptions');

test('error.context is publicContext(), not logContext()', function (DomainError $exception) {
    app()->instance('test.domain-error.instance', $exception);

    $response = $this->getJson('/api/v1/_test/throw-domain-error');

    expect($response->json('error.context'))->toBe($exception->publicContext());
})->with('domain_exceptions');

test('no logContext()-only key or value leaks into the raw response body', function (DomainError $exception) {
    app()->instance('test.domain-error.instance', $exception);

    $response = $this->getJson('/api/v1/_test/throw-domain-error');
    $body = $response->getContent();

    $leaked = array_diff_key($exception->logContext(), $exception->publicContext());

    foreach ($leaked as $key => $value) {
        // Checked as a quoted JSON key (`"status":`), not a bare substring:
        // a bare "status" would false-positive against unrelated content
        // that merely contains the word, e.g. the (intentionally public)
        // error code `appointments.not_cancellable_from_status`.
        expect($body)->not->toContain('"'.$key.'":');
        expect($body)->not->toContain((string) $value);
    }
})->with('domain_exceptions');

test('logContext() reaches the log when a domain error is thrown', function () {
    Log::spy();

    $exception = new NoActiveMembershipException(4321);
    app()->instance('test.domain-error.instance', $exception);

    $this->getJson('/api/v1/_test/throw-domain-error');

    Log::shouldHaveReceived('error')->once()->withArgs(
        fn (string $message, array $context) => $message === $exception->getMessage()
            && $context === $exception->logContext(),
    );
});

test('an unexpected failure does not leak internals when debug is disabled', function () {
    config(['app.debug' => false]);

    $response = $this->getJson('/api/v1/_test/throw-runtime');
    $body = $response->getContent();

    $response->assertStatus(500);
    expect(array_keys($response->json()))->toBe(['message']);
    expect($body)->not->toContain('exception');
    expect($body)->not->toContain('file');
    expect($body)->not->toContain('line');
    expect($body)->not->toContain('trace');
    expect($body)->not->toContain('internal detail 12345');
    expect($body)->not->toContain('RuntimeException');
});

test('abort(500) with no message returns the same generic shape as any other unexpected failure, and does not leak the removed Spanish message', function () {
    config(['app.debug' => false]);

    $response = $this->getJson('/api/v1/_test/abort-500');
    $body = $response->getContent();

    // abort(500) throws an HttpException, which the bootstrap deliberately
    // leaves to Laravel's own default rendering (see the `withExceptions`
    // comment in bootstrap/app.php) rather than routing it through this
    // app's generic 500 body — so the assertion here is on shape (same
    // single `message` key, no debug internals, no leaked Spanish string),
    // not on matching case 5's exact string content.
    $response->assertStatus(500);
    expect(array_keys($response->json()))->toBe(['message']);
    expect($body)->not->toContain('No se pudo autenticar al usuario invitado.');
    expect($body)->not->toContain('exception');
    expect($body)->not->toContain('file');
    expect($body)->not->toContain('line');
    expect($body)->not->toContain('trace');
});

test('a ValidationException still renders the framework default shape, not the domain-error envelope', function () {
    $response = $this->getJson('/api/v1/_test/throw-validation');

    $response->assertStatus(422);
    $response->assertJsonStructure(['message', 'errors']);
    expect($response->json())->not->toHaveKey('error');
});
