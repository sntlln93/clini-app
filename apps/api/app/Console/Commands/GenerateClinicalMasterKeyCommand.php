<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\ClinicalEncryption\EnvKeyManagementService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Encryption\Encrypter;

/**
 * A new master key for the clinical history (#391, ADR 0036). Writes it into an empty `CLINICAL_ENCRYPTION_KEY` of the
 * `.env`, like `key:generate`, but never replaces one: the history depends on it, and changing it is a rotation
 * (`clinical-keys:rotate`). `--show` only prints it, for a server whose environment isn't a file.
 */
#[Description('Generates the master key of the clinical history')]
#[Signature('clinical-keys:generate-master {--show : Print the key instead of writing it into .env}')]
class GenerateClinicalMasterKeyCommand extends Command
{
    public function handle(): int
    {
        $key = 'base64:'.base64_encode(Encrypter::generateKey(EnvKeyManagementService::CIPHER));

        if ($this->option('show')) {
            $this->line($key);

            return self::SUCCESS;
        }

        $path = $this->laravel->environmentFilePath();

        // A deployed container reads its environment, not a .env: a key written there would be lost.
        if (! is_file($path) || $this->laravel->configurationIsCached()) {
            $this->components->error('There is no .env this app reads: print the key with --show and set it in the environment.');

            return self::FAILURE;
        }

        $contents = (string) file_get_contents($path);

        // Empty for the app too: nothing, "" or ''.
        if (preg_match('/^CLINICAL_ENCRYPTION_KEY=(?!""\s*$|\'\'\s*$)\S+/m', $contents) === 1) {
            $this->components->error('CLINICAL_ENCRYPTION_KEY is already set. Replacing it would lose the clinical history: rotate it with clinical-keys:rotate instead.');

            return self::FAILURE;
        }

        $contents = preg_match('/^CLINICAL_ENCRYPTION_KEY=.*$/m', $contents) === 1
            ? (string) preg_replace('/^CLINICAL_ENCRYPTION_KEY=.*$/m', 'CLINICAL_ENCRYPTION_KEY='.$key, $contents)
            : rtrim($contents, "\n")."\nCLINICAL_ENCRYPTION_KEY={$key}\n";

        file_put_contents($path, $contents);

        $this->components->info('Clinical master key set in .env. Keep a copy offline: without it the clinical history cannot be read.');

        return self::SUCCESS;
    }
}
