<?php

declare(strict_types=1);

use App\Contracts\DomainError;
use App\Http\Controllers\Patients\PatientController;
use App\Models\Membership;
use App\Models\Patient;
use App\Support\CurrentOrganization;
use Carbon\CarbonImmutable;
use Illuminate\Database\DeadlockException;
use Illuminate\Database\QueryException;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Route;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mime\Exception\RfcComplianceException;

/**
 * Starts collecting every log record, rendered the way a log file would get it: a
 * Throwable in the context is written out whole, previous exceptions included.
 *
 * @return ArrayObject<int, string>
 */
function captureLogs(): ArrayObject
{
    $records = new ArrayObject;

    Event::listen(MessageLogged::class, function (MessageLogged $event) use ($records): void {
        $context = array_map(
            fn (mixed $value): string => $value instanceof Throwable ? (string) $value : (string) json_encode($value),
            $event->context,
        );

        $records->append($event->message.' '.implode(' ', $context));
    });

    return $records;
}

/**
 * @return list<class-string<DomainError>>
 */
function domainErrorClasses(): array
{
    $classes = [];

    foreach (glob(app_path('Exceptions/*/*.php')) ?: [] as $file) {
        $class = 'App\\Exceptions\\'.basename(dirname($file)).'\\'.basename($file, '.php');

        if (is_subclass_of($class, DomainError::class) && ! (new ReflectionClass($class))->isAbstract()) {
            $classes[] = $class;
        }
    }

    return $classes;
}

/**
 * Builds the exception from its constructor's types alone, so a new domain error is
 * covered without being listed here.
 */
function makeDomainError(string $class): DomainError
{
    $arguments = array_map(function (ReflectionParameter $parameter): mixed {
        $type = $parameter->getType();
        $name = $type instanceof ReflectionNamedType ? $type->getName() : 'string';

        return match (true) {
            $name === 'int' => 1,
            $name === 'float' => 1.0,
            $name === 'bool' => false,
            $name === 'string' => 'x',
            $name === 'array' => [],
            enum_exists($name) => $name::cases()[0],
            is_a(CarbonImmutable::class, $name, true) => CarbonImmutable::parse('2026-01-01T10:00:00Z'),
            $parameter->allowsNull() => null,
            default => throw new LogicException("No test value for {$name} in {$parameter->getDeclaringClass()?->getName()}"),
        };
    }, (new ReflectionClass($class))->getConstructor()?->getParameters() ?? []);

    /** @var DomainError */
    return new $class(...$arguments);
}

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('no domain error logs a personal data key', function () {
    $classes = domainErrorClasses();
    expect(count($classes))->toBeGreaterThan(40);

    foreach ($classes as $class) {
        // An internal id is what logContext() is for, even when its name
        // carries a word below (`clinical_note_id`).
        $keys = array_filter(array_keys(makeDomainError($class)->logContext()), fn (string $key): bool => ! str_ends_with($key, '_id'));

        expect(preg_grep('/name|email|phone|document|dni|address|birth|member_number|slug|note|diagnos|medication/i', $keys))
            ->toBe([], "{$class}::logContext() carries personal data");
    }
});

test('a patient lookup miss logs nothing of the searched document', function () {
    $logs = captureLogs();
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)
        ->postJson('/api/v1/patients/lookup', ['document_type' => 'dni', 'document_number' => '30111222'])
        ->assertNotFound();

    expect($logs)->not->toBeEmpty();
    foreach ($logs as $record) {
        expect($record)->not->toContain('30111222');
    }
});

test('the patient lookup takes the document in the body, never in the URL', function () {
    $membership = Membership::factory()->create();

    expect(Route::getRoutes()->getByAction(PatientController::class.'@lookup')?->methods())->toBe(['POST']);
    // A panel still on the GET answers 405, not a 500 from `patients/{patient}` binding 'lookup'.
    $this->actingAs($membership->user)
        ->getJson('/api/v1/patients/lookup?document_type=dni&document_number=30111222')
        ->assertStatus(405);
});

test('a failed query is logged without its bindings or the database detail', function () {
    $logs = captureLogs();
    Patient::factory()->create(['document_type' => 'dni', 'document_number' => '30111333']);

    Route::post('/api/v1/_test/duplicate-patient', function () {
        Patient::factory()->create(['document_type' => 'dni', 'document_number' => '30111333', 'email' => 'zoe.diaz@example.com']);
    });

    $this->postJson('/api/v1/_test/duplicate-patient')->assertStatus(500);

    expect($logs)->toHaveCount(1);
    expect($logs[0])
        ->toContain('Database query failed.')
        ->toContain('23505')
        ->toContain('patients_document_type_document_number_unique')
        ->not->toContain('30111333')
        ->not->toContain('zoe.diaz@example.com');
});

test('a deadlock in a nested transaction is logged without the query bindings', function () {
    $logs = captureLogs();

    Route::post('/api/v1/_test/deadlock', function () {
        $query = new QueryException('pgsql', 'insert into patients (document_number) values (?)', ['30111444'], new PDOException('SQLSTATE[40P01]: Deadlock detected'));

        throw new DeadlockException($query->getMessage(), 40001, $query);
    });

    $this->postJson('/api/v1/_test/deadlock')->assertStatus(500);

    expect($logs)->toHaveCount(1);
    expect($logs[0])->toContain('Database query failed.')->not->toContain('30111444');
});

test('a rejected mail address is kept out of the log', function (Throwable $exception, string $address) {
    $logs = captureLogs();

    Route::post('/api/v1/_test/mail-failure', fn () => throw $exception);

    $this->postJson('/api/v1/_test/mail-failure')->assertStatus(500);

    expect($logs)->toHaveCount(1);
    expect($logs[0])
        ->toContain('Mail delivery failed.')
        ->not->toContain($address)
        ->not->toContain('zoe');
})->with([
    'RFC check' => [fn () => new RfcComplianceException('Email "zoe(x)@example.com" does not comply with addr-spec of RFC 2822.'), 'zoe(x)@example.com'],
    'transport' => [fn () => new TransportException('Expected response code "250" but got code "550", with message "550 5.1.1 <zoe.diaz@example.com>: Recipient address rejected".'), 'zoe.diaz@example.com'],
    'transport, bare address' => [fn () => new TransportException('Request to Resend API failed. Reason: Invalid `to` field: zoe(x)@example.com.'), 'zoe(x)@example.com'],
]);
