<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * `path` is the object key in the `media` bucket (ADR 0015).
 */
#[Fillable(['organization_id', 'mime_type', 'path', 'checksum'])]
class OrganizationLogo extends Model
{
    use BelongsToOrganization;

    public const DISK = 'media';
}
