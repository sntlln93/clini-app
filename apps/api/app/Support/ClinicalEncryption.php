<?php

declare(strict_types=1);

namespace App\Support;

use App\Contracts\KeyManagementService;
use App\Models\ClinicalEncryptionKey;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Contracts\Encryption\EncryptException;
use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\DB;

/**
 * Envelope encryption of the free clinical content (#391, ADR 0036). Each value is encrypted with a data key as
 * `<key id>:<ciphertext>`; the data key lives in `clinical_encryption_keys`, encrypted with the master key that only
 * the `KeyManagementService` holds. The history is append-only (ADR 0019) and can't be re-encrypted, so rotating the
 * master key re-encrypts the data key alone.
 *
 * A singleton: each data key is decrypted once per process.
 */
final class ClinicalEncryption
{
    private const string CIPHER = 'aes-256-gcm';

    /**
     * @var array<int, Encrypter>
     */
    private array $encrypters = [];

    private ?int $currentKeyId = null;

    public function __construct(private readonly KeyManagementService $keys) {}

    public function encrypt(string $value): string
    {
        if ($this->currentKeyId === null) {
            $key = ClinicalEncryptionKey::query()->latest('id')->first()
                ?? throw new EncryptException('The clinical history has no data key: run the migrations.');

            $this->encrypterFor($key);
            $this->currentKeyId = $key->id;
        }

        return $this->currentKeyId.':'.$this->encrypters[$this->currentKeyId]->encryptString($value);
    }

    public function decrypt(string $stored): string
    {
        [$keyId, $payload] = array_pad(explode(':', $stored, 2), 2, '');

        if (preg_match('/\A[1-9]\d*\z/', $keyId) !== 1 || $payload === '') {
            throw new DecryptException('The value is not encrypted clinical content.');
        }

        if (! isset($this->encrypters[(int) $keyId])) {
            $key = ClinicalEncryptionKey::query()->find((int) $keyId)
                ?? throw new DecryptException('The value names a data key that does not exist.');

            $this->encrypterFor($key);
        }

        return $this->encrypters[(int) $keyId]->decryptString($payload);
    }

    /**
     * The one data key the history uses. Only the migration that creates its table calls it.
     */
    public function createDataKey(): ClinicalEncryptionKey
    {
        return ClinicalEncryptionKey::query()->create([
            'wrapped_key' => $this->keys->wrap(Encrypter::generateKey(self::CIPHER)),
        ]);
    }

    /**
     * Re-encrypts every data key with the current master key, all in one transaction: a failure halfway leaves every
     * key as it was. The history itself is not touched.
     *
     * @return int how many data keys it re-encrypted
     */
    public function rotateMasterKey(): int
    {
        $rotated = DB::transaction(function (): int {
            $keys = ClinicalEncryptionKey::query()->orderBy('id')->lockForUpdate()->get();

            foreach ($keys as $key) {
                $dataKey = $this->keys->unwrap($key->wrapped_key);
                $wrapped = $this->keys->wrap($dataKey);

                if (! hash_equals($dataKey, $this->keys->unwrap($wrapped))) {
                    throw new EncryptException("Data key {$key->id} did not survive its re-encryption.");
                }

                $key->update(['wrapped_key' => $wrapped]);
            }

            return $keys->count();
        });

        $this->encrypters = [];
        $this->currentKeyId = null;

        return $rotated;
    }

    private function encrypterFor(ClinicalEncryptionKey $key): Encrypter
    {
        return $this->encrypters[$key->id] ??= new Encrypter($this->keys->unwrap($key->wrapped_key), self::CIPHER);
    }
}
