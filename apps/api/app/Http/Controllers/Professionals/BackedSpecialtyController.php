<?php

declare(strict_types=1);

namespace App\Http\Controllers\Professionals;

use App\Http\Controllers\Controller;
use App\Http\Resources\Professionals\SpecialtyResource;
use App\Models\Membership;
use App\Models\ProfessionalSpecialty;
use App\Models\Specialty;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/**
 * The specialties a professional's verified licenses back (#387, ADR 0038): the only ones a practice may offer them
 * with. The registry decides them; nobody picks them.
 */
class BackedSpecialtyController extends Controller
{
    public function index(Membership $membership): AnonymousResourceCollection
    {
        Gate::authorize('viewBacked', [ProfessionalSpecialty::class, $membership]);

        $specialties = Specialty::query()
            ->backedFor($membership->user_id)
            ->orderBy('name')
            ->get();

        return SpecialtyResource::collection($specialties);
    }
}
