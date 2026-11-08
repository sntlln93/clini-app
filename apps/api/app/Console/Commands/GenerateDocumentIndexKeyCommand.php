<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * A new key for the DNI's blind index (#417): `base64:` followed by 32 random bytes, printed for the environment. It
 * never writes it anywhere: replacing a key in use is a rotation (`document-index:rotate`).
 */
#[Description('Prints a new key for the blind index of the professionals\' DNI')]
#[Signature('document-index:generate-key')]
class GenerateDocumentIndexKeyCommand extends Command
{
    public function handle(): int
    {
        $this->line('base64:'.base64_encode(random_bytes(32)));

        return self::SUCCESS;
    }
}
