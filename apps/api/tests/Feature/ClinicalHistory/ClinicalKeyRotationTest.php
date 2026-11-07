<?php

declare(strict_types=1);

use App\Contracts\KeyManagementService;
use App\Models\ClinicalEncryptionKey;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteVersion;
use App\Services\ClinicalEncryption\EnvKeyManagementService;
use App\Support\ClinicalEncryption;
use App\Support\CurrentOrganization;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Contracts\Encryption\EncryptException;
use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\Config;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function newClinicalMasterKey(): string
{
    return 'base64:'.base64_encode(Encrypter::generateKey(EnvKeyManagementService::CIPHER));
}

/**
 * A fresh process, as the server is after its environment changes: no data key decrypted yet.
 */
function restartClinicalEncryption(): void
{
    app()->forgetInstance(ClinicalEncryption::class);
}

test('after rotating and removing the old master key the whole history still reads', function () {
    $note = ClinicalNote::factory()->withBody('Escrita con la maestra vieja.')->create();
    $oldKey = Config::string('clinical_encryption.key');
    $newKey = newClinicalMasterKey();

    Config::set('clinical_encryption.key', $newKey);
    Config::set('clinical_encryption.previous_keys', [$oldKey]);
    restartClinicalEncryption();
    $this->artisan('clinical-keys:rotate')->assertSuccessful();

    Config::set('clinical_encryption.previous_keys', []);
    restartClinicalEncryption();

    expect(ClinicalNoteVersion::query()->where('clinical_note_id', $note->id)->sole()->body)->toBe('Escrita con la maestra vieja.');

    // And what is written after the rotation reads too, with the same data key.
    $note->versions()->create(['version' => 2, 'membership_id' => $note->membership_id, 'body' => 'Escrita con la maestra nueva.']);
    restartClinicalEncryption();
    expect($note->versions()->pluck('body')->all())->toBe(['Escrita con la maestra vieja.', 'Escrita con la maestra nueva.'])
        ->and(ClinicalEncryptionKey::query()->count())->toBe(1);
});

test('the old master key no longer opens the data key once rotated', function () {
    $oldKey = Config::string('clinical_encryption.key');

    Config::set('clinical_encryption.key', newClinicalMasterKey());
    Config::set('clinical_encryption.previous_keys', [$oldKey]);
    $this->artisan('clinical-keys:rotate')->assertSuccessful();

    Config::set('clinical_encryption.key', $oldKey);
    Config::set('clinical_encryption.previous_keys', []);

    expect(fn () => app(EnvKeyManagementService::class)->unwrap(ClinicalEncryptionKey::query()->sole()->wrapped_key))
        ->toThrow(DecryptException::class);
});

test('a rotation that fails halfway leaves every data key as it was', function () {
    ClinicalNote::factory()->withBody('Sigue legible.')->create();
    app(ClinicalEncryption::class)->createDataKey();
    $before = ClinicalEncryptionKey::query()->orderBy('id')->pluck('wrapped_key', 'id')->all();
    expect($before)->toHaveCount(2);

    $oldKey = Config::string('clinical_encryption.key');
    Config::set('clinical_encryption.key', newClinicalMasterKey());
    Config::set('clinical_encryption.previous_keys', [$oldKey]);

    // The second data key fails to re-encrypt, after the first one already was.
    app()->bind(KeyManagementService::class, fn () => new class(new EnvKeyManagementService) implements KeyManagementService
    {
        private int $wraps = 0;

        public function __construct(private readonly KeyManagementService $inner) {}

        public function wrap(string $dataKey): string
        {
            if (++$this->wraps === 2) {
                throw new EncryptException('The KMS went away.');
            }

            return $this->inner->wrap($dataKey);
        }

        public function unwrap(string $wrappedKey): string
        {
            return $this->inner->unwrap($wrappedKey);
        }
    });
    restartClinicalEncryption();

    expect(fn () => $this->artisan('clinical-keys:rotate'))->toThrow(EncryptException::class, 'The KMS went away.');
    expect(ClinicalEncryptionKey::query()->orderBy('id')->pluck('wrapped_key', 'id')->all())->toBe($before);

    // Still readable with the old master key alone.
    Config::set('clinical_encryption.key', $oldKey);
    Config::set('clinical_encryption.previous_keys', []);
    app()->bind(KeyManagementService::class, EnvKeyManagementService::class);
    restartClinicalEncryption();
    expect(ClinicalNoteVersion::query()->latest('id')->firstOrFail()->body)->toBe('Sigue legible.');
});

test('without a master key nothing clinical is written', function () {
    Config::set('clinical_encryption.key', null);
    restartClinicalEncryption();

    expect(fn () => ClinicalNote::factory()->withBody('No debe quedar en claro.')->create())
        ->toThrow(EncryptException::class, 'CLINICAL_ENCRYPTION_KEY is not set');
});

test('the master key is never APP_KEY', function () {
    Config::set('clinical_encryption.key', Config::string('app.key'));

    expect(fn () => app(EnvKeyManagementService::class)->wrap('data key'))
        ->toThrow(EncryptException::class, 'must not be APP_KEY');
});

test('production refuses the public development key, however it is spelled', function (string $key) {
    Config::set('clinical_encryption.key', $key);
    app()->detectEnvironment(fn () => 'production');

    expect(fn () => app(EnvKeyManagementService::class)->wrap('data key'))
        ->toThrow(EncryptException::class, 'public development key');
})->with([
    'as published' => [EnvKeyManagementService::DEVELOPMENT_KEY],
    'without its padding' => [rtrim(EnvKeyManagementService::DEVELOPMENT_KEY, '=')],
    'with other ignored trailing bits' => [substr(EnvKeyManagementService::DEVELOPMENT_KEY, 0, -2).'t='],
]);

test('the master key is never a retired APP_KEY either, nor APP_KEY spelled another way', function () {
    $appKey = 'base64:'.base64_encode(random_bytes(32));
    Config::set('app.previous_keys', [$appKey]);
    Config::set('clinical_encryption.key', rtrim($appKey, '='));

    expect(fn () => app(EnvKeyManagementService::class)->wrap('data key'))
        ->toThrow(EncryptException::class, 'must not be APP_KEY');
});

test('a malformed master key is refused', function (string $key) {
    Config::set('clinical_encryption.key', $key);

    expect(fn () => app(EnvKeyManagementService::class)->wrap('data key'))
        ->toThrow(EncryptException::class, '32 random bytes');
})->with([
    'without the base64 prefix' => [base64_encode(random_bytes(32))],
    'too short' => ['base64:'.base64_encode(random_bytes(16))],
]);

test('a value that is not encrypted clinical content is never read as such', function (string $stored) {
    expect(fn () => app(ClinicalEncryption::class)->decrypt($stored))->toThrow(DecryptException::class);
})->with([
    'plain text' => ['Texto en claro.'],
    'no payload' => ['1:'],
    'unknown data key' => ['999999:eyJpdiI6IiJ9'],
]);

test('generating the master key fills an empty one and never replaces one', function () {
    $directory = sys_get_temp_dir().'/clinical-master-'.bin2hex(random_bytes(4));
    mkdir($directory);
    file_put_contents("{$directory}/.env", "APP_NAME=Clini\nCLINICAL_ENCRYPTION_KEY=\n");
    app()->useEnvironmentPath($directory);

    try {
        $this->artisan('clinical-keys:generate-master')->assertSuccessful();
        $written = (string) file_get_contents("{$directory}/.env");
        expect($written)->toMatch('/^CLINICAL_ENCRYPTION_KEY=base64:[A-Za-z0-9+\/]{43}=$/m');

        $this->artisan('clinical-keys:generate-master')->assertFailed();
        expect(file_get_contents("{$directory}/.env"))->toBe($written);
    } finally {
        unlink("{$directory}/.env");
        rmdir($directory);
    }
});

test('generating the master key fills one left as an empty quoted value', function () {
    $directory = sys_get_temp_dir().'/clinical-master-'.bin2hex(random_bytes(4));
    mkdir($directory);
    file_put_contents("{$directory}/.env", "CLINICAL_ENCRYPTION_KEY=\"\"\n");
    app()->useEnvironmentPath($directory);

    try {
        $this->artisan('clinical-keys:generate-master')->assertSuccessful();
        expect(file_get_contents("{$directory}/.env"))->toMatch('/^CLINICAL_ENCRYPTION_KEY=base64:\S{44}$/m');
    } finally {
        unlink("{$directory}/.env");
        rmdir($directory);
    }
});

test('generating the master key never writes a .env the app does not read', function () {
    $directory = sys_get_temp_dir().'/clinical-master-'.bin2hex(random_bytes(4));
    mkdir($directory);
    app()->useEnvironmentPath($directory);

    try {
        $this->artisan('clinical-keys:generate-master')->assertFailed();
        expect(file_exists("{$directory}/.env"))->toBeFalse();
    } finally {
        rmdir($directory);
    }
});

test('the master key can be printed for a server whose environment is not a file', function () {
    $this->artisan('clinical-keys:generate-master', ['--show' => true])
        ->expectsOutputToContain('base64:')
        ->assertSuccessful();
});
