<?php

declare(strict_types=1);

namespace App\Contracts;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Contracts\Encryption\EncryptException;

/**
 * Holds the master key of the clinical history's envelope encryption (#391, ADR 0036) and only ever encrypts or
 * decrypts a data key with it, so the master key itself never reaches the rest of the app. The environment holds it
 * today (`EnvKeyManagementService`); a KMS is another adapter, and moving to one only re-encrypts the data key.
 */
interface KeyManagementService
{
    /**
     * Encrypts a data key with the current master key.
     *
     * @throws EncryptException when no usable master key is configured
     */
    public function wrap(string $dataKey): string;

    /**
     * Decrypts a data key encrypted with the current master key or with one being retired.
     *
     * @throws DecryptException when no configured master key opens it
     */
    public function unwrap(string $wrappedKey): string;
}
