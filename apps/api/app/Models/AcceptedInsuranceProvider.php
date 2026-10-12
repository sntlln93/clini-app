<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * An insurance provider the practice works with (#291): only these are
 * offered on its public booking page.
 */
#[Fillable(['organization_id', 'insurance_provider_id'])]
class AcceptedInsuranceProvider extends Model
{
    use BelongsToOrganization;
}
