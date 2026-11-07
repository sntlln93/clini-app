<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Support\ClinicalEncryption;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Rotating the master key of the clinical history (#391, ADR 0036): with the new key in `CLINICAL_ENCRYPTION_KEY` and
 * the old one in `CLINICAL_ENCRYPTION_PREVIOUS_KEYS`, re-encrypts the data key with the new one. The history itself is
 * never re-encrypted. Afterwards the old key leaves the server (docs/architecture/security.md).
 */
#[Description('Re-encrypts the data key of the clinical history with the current master key')]
#[Signature('clinical-keys:rotate')]
class RotateClinicalKeysCommand extends Command
{
    public function handle(ClinicalEncryption $encryption): int
    {
        $rotated = $encryption->rotateMasterKey();

        $this->components->info("Re-encrypted {$rotated} data key(s) with the current master key. Remove CLINICAL_ENCRYPTION_PREVIOUS_KEYS from the server and keep the retired key offline.");

        return self::SUCCESS;
    }
}
