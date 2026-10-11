<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;

/**
 * `content` is the image base64-encoded (ADR 0015), hidden so it never
 * leaks into a serialized payload.
 */
#[Fillable(['organization_id', 'mime_type', 'content', 'checksum'])]
#[Hidden(['content'])]
class OrganizationLogo extends Model
{
    use BelongsToOrganization;

    public function binary(): string
    {
        return (string) base64_decode($this->content, true);
    }
}
