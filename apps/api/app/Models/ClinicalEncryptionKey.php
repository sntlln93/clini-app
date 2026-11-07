<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * A data key of the clinical history (#391, ADR 0036), encrypted with the master key. Unlike the history it encrypts,
 * it is updated in place: rotating the master key re-encrypts only this row. Every encrypted value names its row, as
 * `<id>:<ciphertext>`.
 */
#[Fillable(['wrapped_key'])]
class ClinicalEncryptionKey extends Model {}
