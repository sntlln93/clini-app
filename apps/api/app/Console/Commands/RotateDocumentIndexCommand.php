<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Actions\Professionals\RotateDocumentIndexAction;
use App\Data\Professionals\DocumentIndexRotationData;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Rotating the key of the DNI's blind index (#417): with the new key in `DOCUMENT_INDEX_KEY` and the old one in
 * `DOCUMENT_INDEX_PREVIOUS_KEY`, both read from the environment (never arguments, which stay in the shell's history),
 * recomputes every account's index with the new key. Then the old key leaves the server
 * (docs/architecture/security.md). Prints only counts, never a DNI.
 */
#[Description('Recomputes the blind index of every professional DNI with the current key')]
#[Signature('document-index:rotate')]
class RotateDocumentIndexCommand extends Command
{
    public function handle(RotateDocumentIndexAction $action): int
    {
        $rotated = $action->handle(new DocumentIndexRotationData);

        $this->components->info("Recomputed the index of {$rotated} DNI(s) with DOCUMENT_INDEX_KEY. Remove DOCUMENT_INDEX_PREVIOUS_KEY from the server.");

        return self::SUCCESS;
    }
}
