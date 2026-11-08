<?php

declare(strict_types=1);

use App\Models\User;
use App\Support\DocumentIndex;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * The DNI's blind index (#417): an HMAC with its own key, the only way a DNI is searched; one DNI, one account; and the
 * rotation of its key.
 */
const ROTATED_KEY = 'base64:cm90YXRlZC1rZXktZm9yLXRlc3RzLW9ubHktMzJieXQ=';

function storedIndex(User $user): ?string
{
    return DB::table('users')->where('id', $user->id)->value('document_number_index');
}

test('the index is an HMAC-SHA256 of the DNI with its own key, the same however it is written', function () {
    $key = (string) base64_decode(substr(DocumentIndex::DEVELOPMENT_KEY, 7));

    expect(DocumentIndex::of('30123456'))->toBe(hash_hmac('sha256', '30123456', $key))
        ->and(DocumentIndex::of('030.123.456'))->toBe(DocumentIndex::of('30123456'))
        ->and(DocumentIndex::of('30123456'))->not->toBe(hash('sha256', '30123456'));
});

test('writing the DNI writes its index, and taking it away takes the index too', function () {
    $user = User::factory()->create(['document_number' => '30123456']);

    expect(storedIndex($user))->toBe(DocumentIndex::of('30123456'))
        ->and(User::query()->withDocument('30123456')->sole()->id)->toBe($user->id);

    $user->forceFill(['document_number' => null])->save();

    expect(storedIndex($user))->toBeNull();
});

test('one DNI, one account: the index is unique in the database', function () {
    User::factory()->create(['document_number' => '30123456']);

    expect(fn () => User::factory()->create(['document_number' => '30123456']))->toThrow(UniqueConstraintViolationException::class);
});

test('the key must be its own: missing, short, APP_KEY\'s, the clinical one\'s, or the public one in production', function (Closure $configure) {
    $configure();

    expect(fn () => DocumentIndex::of('30123456'))->toThrow(LogicException::class);
})->with([
    'missing' => [fn () => config(['document_index.key' => null])],
    'short' => [fn () => config(['document_index.key' => 'base64:'.base64_encode('short')])],
    'APP_KEY' => [fn () => config(['document_index.key' => config('app.key')])],
    'the clinical master key' => [fn () => config(['document_index.key' => config('clinical_encryption.key')])],
    'the public key in production' => [fn () => app()->detectEnvironment(fn (): string => 'production')],
]);

test('while rotating, a DNI is found under either key; after the rotation, only under the new one', function () {
    $user = User::factory()->create(['document_number' => '30123456']);
    $oldIndex = storedIndex($user);

    config(['document_index.key' => ROTATED_KEY, 'document_index.previous_key' => DocumentIndex::DEVELOPMENT_KEY]);

    expect(User::query()->withDocument('30123456')->sole()->id)->toBe($user->id);

    $this->artisan('document-index:rotate')
        ->doesntExpectOutputToContain('30123456')
        ->expectsOutputToContain('1 DNI')
        ->assertSuccessful();

    expect(storedIndex($user))->not->toBe($oldIndex)->toBe(DocumentIndex::of('30123456'));

    config(['document_index.previous_key' => null]);

    expect(User::query()->withDocument('30123456')->sole()->id)->toBe($user->id);

    config(['document_index.key' => DocumentIndex::DEVELOPMENT_KEY]);

    expect(User::query()->withDocument('30123456')->exists())->toBeFalse();
});

test('a rotation leaves accounts without a DNI alone', function () {
    $without = User::factory()->create();
    User::factory()->create(['document_number' => '30123456']);
    config(['document_index.key' => ROTATED_KEY]);

    $this->artisan('document-index:rotate')->assertSuccessful();

    expect(storedIndex($without))->toBeNull();
});

test('the key generator prints a valid key', function () {
    $this->artisan('document-index:generate-key')->expectsOutputToContain('base64:')->assertSuccessful();
});
